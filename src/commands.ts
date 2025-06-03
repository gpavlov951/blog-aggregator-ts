import { getCurrentUser, setUser } from "./config";
import { scrapeFeeds } from "./feed";
import {
  createFeedFollow,
  deleteFeedFollow,
  getFeedFollowsForUser,
} from "./lib/db/queries/feed-follows";
import {
  createFeed,
  getAllFeedsWithUsers,
  getFeedByUrl,
} from "./lib/db/queries/feeds";
import { getPostsForUser } from "./lib/db/queries/posts";
import {
  createUser,
  deleteAllUsers,
  getUserByName,
  getUsers,
} from "./lib/db/queries/users";
import { User } from "./lib/schema";
import { CommandHandler, UserCommandHandler } from "./middleware";

export type Command =
  | "login"
  | "register"
  | "reset"
  | "users"
  | "agg"
  | "addfeed"
  | "feeds"
  | "follow"
  | "following"
  | "unfollow"
  | "browse";

export type CommandsRegistry = Record<Command, CommandHandler>;

export async function handlerLogin(
  cmdName: Command,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(`${cmdName} command requires a username argument`);
  }

  const username = args[0];

  const user = await getUserByName(username);
  if (!user) {
    throw new Error(`User "${username}" does not exist`);
  }

  setUser(username);
  console.log(`User set to: ${username}`);
}

export async function handlerRegister(
  cmdName: Command,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(`${cmdName} command requires a username argument`);
  }

  const username = args[0];

  const existingUser = await getUserByName(username);
  if (existingUser) {
    throw new Error(`User with name "${username}" already exists`);
  }

  const newUser = await createUser(username);

  setUser(username);

  console.log(`User "${username}" created successfully!`);
  console.log("User data:", newUser);
}

export async function handlerReset(): Promise<void> {
  try {
    await deleteAllUsers();
    console.log("Database reset successful - all users have been deleted");
  } catch (error) {
    throw new Error(
      `Failed to reset database: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function handlerUsers(): Promise<void> {
  const users = await getUsers();
  const currentUser = getCurrentUser();

  users.forEach((user) => {
    const isCurrent = user.name === currentUser;
    console.log(`* ${user.name}${isCurrent ? " (current)" : ""}`);
  });
}

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error(
      `Invalid duration format: ${durationStr}. Use format like 1s, 1m, 1h, etc.`
    );
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h${minutes % 60}m${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function handleError(error: unknown): void {
  console.error(
    "Error during feed scraping:",
    error instanceof Error ? error.message : String(error)
  );
}

export async function handlerAgg(
  cmdName: Command,
  ...args: string[]
): Promise<void> {
  if (args.length !== 1) {
    throw new Error(
      `${cmdName} command requires a time_between_reqs argument (e.g., 1s, 1m, 1h)`
    );
  }

  const durationStr = args[0];

  try {
    const timeBetweenRequests = parseDuration(durationStr);
    const formattedDuration = formatDuration(timeBetweenRequests);

    console.log(`Collecting feeds every ${formattedDuration}`);

    scrapeFeeds().catch(handleError);

    const interval = setInterval(() => {
      scrapeFeeds().catch(handleError);
    }, timeBetweenRequests);

    await new Promise<void>((resolve) => {
      process.on("SIGINT", () => {
        console.log("Shutting down feed aggregator...");
        clearInterval(interval);
        resolve();
      });
    });
  } catch (error) {
    throw new Error(
      `Failed to start feed aggregation: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export const handlerAddFeed: UserCommandHandler = async (
  cmdName: Command,
  user: User,
  ...args: string[]
): Promise<void> => {
  if (args.length < 2) {
    throw new Error(`${cmdName} command requires name and url arguments`);
  }

  const [name, url] = args;

  try {
    const newFeed = await createFeed(name, url, user.id);

    const feedFollow = await createFeedFollow(user.id, newFeed.id);

    console.log("Feed created successfully!");
    console.log(`Following feed: ${feedFollow.feedName}`);
    console.log(`User: ${feedFollow.userName}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) {
      throw new Error(`Feed with URL "${url}" already exists`);
    }
    throw new Error(
      `Failed to create feed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export async function handlerFeeds(
  cmdName: Command,
  ...args: string[]
): Promise<void> {
  if (args.length > 0) {
    throw new Error(`${cmdName} command takes no arguments`);
  }

  const feedsWithUsers = await getAllFeedsWithUsers();

  if (feedsWithUsers.length === 0) {
    console.log("No feeds found in the database.");
    return;
  }

  console.log("Feeds in the database:");
  console.log("----------------------");

  for (const { feed, user } of feedsWithUsers) {
    console.log(`* Name: ${feed.name}`);
    console.log(`* URL: ${feed.url}`);
    console.log(`* Created by: ${user?.name ?? "Unknown"}`);
    console.log("----------------------");
  }
}

export const handlerFollow: UserCommandHandler = async (
  cmdName: Command,
  user: User,
  ...args: string[]
): Promise<void> => {
  if (args.length !== 1) {
    throw new Error(`${cmdName} command requires a url argument`);
  }

  const url = args[0];

  const feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error(`Feed with URL "${url}" not found`);
  }

  try {
    const feedFollow = await createFeedFollow(user.id, feed.id);

    console.log(`Following feed: ${feedFollow.feedName}`);
    console.log(`User: ${feedFollow.userName}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) {
      throw new Error(`You are already following this feed`);
    }
    throw new Error(
      `Failed to follow feed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const handlerFollowing: UserCommandHandler = async (
  cmdName: Command,
  user: User,
  ...args: string[]
): Promise<void> => {
  if (args.length > 0) {
    throw new Error(`${cmdName} command takes no arguments`);
  }

  const feedFollows = await getFeedFollowsForUser(user.id);

  if (feedFollows.length === 0) {
    console.log("You are not following any feeds.");
    return;
  }

  console.log("Feeds you are following:");
  console.log("------------------------");
  for (const follow of feedFollows) {
    console.log(`* ${follow.feedName}`);
  }
};

export const handlerUnfollow: UserCommandHandler = async (
  cmdName: Command,
  user: User,
  ...args: string[]
): Promise<void> => {
  if (args.length !== 1) {
    throw new Error(`${cmdName} command requires a url argument`);
  }

  const url = args[0];

  try {
    await deleteFeedFollow(user.id, url);
    console.log(`Successfully unfollowed feed with URL: ${url}`);
  } catch (error) {
    throw new Error(
      `Failed to unfollow feed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const handlerBrowse: UserCommandHandler = async (
  cmdName: Command,
  user: User,
  ...args: string[]
): Promise<void> => {
  if (args.length > 1) {
    throw new Error(`${cmdName} command takes at most one argument (limit)`);
  }

  let limit = 2;

  if (args.length === 1) {
    const parsedLimit = parseInt(args[0], 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new Error("Limit must be a positive number");
    }
    limit = parsedLimit;
  }

  try {
    const postsWithFeeds = await getPostsForUser(user.id, limit);

    if (postsWithFeeds.length === 0) {
      console.log(
        "No posts found. You might not be following any feeds, or the feeds you follow don't have any posts yet."
      );
      return;
    }

    console.log(`Latest ${postsWithFeeds.length} posts:`);
    console.log("=".repeat(50));

    for (const { post, feed } of postsWithFeeds) {
      console.log(`Title: ${post.title}`);
      console.log(`URL: ${post.url}`);
      console.log(`Feed: ${feed.name}`);
      if (post.description) {
        console.log(`Description: ${post.description}`);
      }
      if (post.publishedAt) {
        console.log(`Published: ${post.publishedAt.toLocaleString()}`);
      }
      console.log("-".repeat(30));
    }
  } catch (error) {
    throw new Error(
      `Failed to browse posts: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: Command,
  handler: CommandHandler
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: Command,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }
  await handler(cmdName, ...args);
}

import { getCurrentUser, setUser } from "./config";
import { fetchFeed } from "./feed";
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
  | "unfollow";

// Command registry type using Record utility type
export type CommandsRegistry = Record<Command, CommandHandler>;

// Login command handler
export async function handlerLogin(...args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error("Login command requires a username argument");
  }

  const username = args[0];

  // Check if user exists
  const user = await getUserByName(username);
  if (!user) {
    throw new Error(`User "${username}" does not exist`);
  }

  setUser(username);
  console.log(`User set to: ${username}`);
}

// Register command handler
export async function handlerRegister(...args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error("Register command requires a username argument");
  }

  const username = args[0];

  // Check if user already exists
  const existingUser = await getUserByName(username);
  if (existingUser) {
    throw new Error(`User with name "${username}" already exists`);
  }

  // Create new user
  const newUser = await createUser(username);

  // Set as current user
  setUser(username);

  // Print success message and user data
  console.log(`User "${username}" created successfully!`);
  console.log("User data:", newUser);
}

// Reset command handler
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

// Users command handler
export async function handlerUsers(): Promise<void> {
  const users = await getUsers();
  const currentUser = getCurrentUser();

  users.forEach((user) => {
    const isCurrent = user.name === currentUser;
    console.log(`* ${user.name}${isCurrent ? " (current)" : ""}`);
  });
}

// Agg command handler
export async function handlerAgg(): Promise<void> {
  try {
    const feed = await fetchFeed("https://www.wagslane.dev/index.xml");
    console.log(JSON.stringify(feed, null, 2));
  } catch (error) {
    throw new Error(
      `Failed to fetch feed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Add feed command handler
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
    // Create the feed
    const newFeed = await createFeed(name, url, user.id);

    // Create a feed follow record for the creator
    const feedFollow = await createFeedFollow(user.id, newFeed.id);

    // Print the feed details
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

// List feeds command handler
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

// Follow command handler
export const handlerFollow: UserCommandHandler = async (
  cmdName: Command,
  user: User,
  ...args: string[]
): Promise<void> => {
  if (args.length !== 1) {
    throw new Error(`${cmdName} command requires a url argument`);
  }

  const url = args[0];

  // Find the feed by URL
  const feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error(`Feed with URL "${url}" not found`);
  }

  try {
    // Create the feed follow record
    const feedFollow = await createFeedFollow(user.id, feed.id);

    // Print success message
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

// Following command handler
export const handlerFollowing: UserCommandHandler = async (
  cmdName: Command,
  user: User,
  ...args: string[]
): Promise<void> => {
  if (args.length > 0) {
    throw new Error(`${cmdName} command takes no arguments`);
  }

  // Get all feeds the user is following
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

// Unfollow command handler
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

// Register a new command
export function registerCommand(
  registry: CommandsRegistry,
  cmdName: Command,
  handler: CommandHandler
): void {
  registry[cmdName] = handler;
}

// Run a command
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

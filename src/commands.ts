import { setUser, getCurrentUser } from "./config";
import {
  createUser,
  getUserByName,
  deleteAllUsers,
  getUsers,
} from "./lib/db/queries/users";
import { createFeed, getAllFeedsWithUsers } from "./lib/db/queries/feeds";
import { printFeed } from "./lib/helpers";
import { fetchFeed } from "./feed";

export type Command =
  | "login"
  | "register"
  | "reset"
  | "users"
  | "agg"
  | "addfeed"
  | "feeds";

// Command handler type definition
export type CommandHandler = (
  cmdName: Command,
  ...args: string[]
) => Promise<void>;

// Command registry type using Record utility type
export type CommandsRegistry = Record<Command, CommandHandler>;

// Login command handler
export async function handlerLogin(
  cmdName: Command,
  ...args: string[]
): Promise<void> {
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
export async function handlerRegister(
  cmdName: Command,
  ...args: string[]
): Promise<void> {
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
export async function handlerReset(
  cmdName: Command,
  ...args: string[]
): Promise<void> {
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
export async function handlerUsers(
  cmdName: Command,
  ...args: string[]
): Promise<void> {
  const users = await getUsers();
  const currentUser = getCurrentUser();

  users.forEach((user) => {
    const isCurrent = user.name === currentUser;
    console.log(`* ${user.name}${isCurrent ? " (current)" : ""}`);
  });
}

// Agg command handler
export async function handlerAgg(
  cmdName: Command,
  ...args: string[]
): Promise<void> {
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
export async function handlerAddFeed(
  cmdName: Command,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error(`${cmdName} command requires name and url arguments`);
  }

  const [name, url] = args;
  const currentUsername = getCurrentUser();

  if (!currentUsername) {
    throw new Error("No user is currently logged in. Please login first.");
  }

  // Get the current user from the database
  const user = await getUserByName(currentUsername);
  if (!user) {
    throw new Error(`Current user "${currentUsername}" not found in database`);
  }

  try {
    // Create the feed
    const newFeed = await createFeed(name, url, user.id);

    // Print the feed details
    console.log("Feed created successfully!");
    printFeed(newFeed, user);
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
}

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

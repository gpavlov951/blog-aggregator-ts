import { setUser, getCurrentUser } from "./config";
import {
  createUser,
  getUserByName,
  deleteAllUsers,
  getUsers,
} from "./lib/db/queries/users";

export type Command = "login" | "register" | "reset" | "users";

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

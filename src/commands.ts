import { setUser } from "./config";

// Command handler type definition
export type CommandHandler = (cmdName: string, ...args: string[]) => void;

// Command registry type using Record utility type
export type CommandsRegistry = Record<string, CommandHandler>;

// Login command handler
export function handlerLogin(cmdName: string, ...args: string[]): void {
  if (args.length === 0) {
    throw new Error("Login command requires a username argument");
  }

  const username = args[0];
  setUser(username);
  console.log(`User set to: ${username}`);
}

// Register a new command
export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler
): void {
  registry[cmdName] = handler;
}

// Run a command
export function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): void {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }
  handler(cmdName, ...args);
}

import { Command } from "./commands";
import { getCurrentUser } from "./config";
import { getUserByName } from "./lib/db/queries/users";
import { User } from "./lib/schema";

export type CommandHandler = (
  cmdName: Command,
  ...args: string[]
) => Promise<void>;

export type UserCommandHandler = (
  cmdName: Command,
  user: User,
  ...args: string[]
) => Promise<void>;

export function middlewareLoggedIn(
  handler: UserCommandHandler
): CommandHandler {
  return async (cmdName: Command, ...args: string[]): Promise<void> => {
    const currentUsername = getCurrentUser();
    if (!currentUsername) {
      throw new Error("No user is currently logged in. Please login first.");
    }

    const user = await getUserByName(currentUsername);
    if (!user) {
      throw new Error(
        `Current user "${currentUsername}" not found in database`
      );
    }

    return handler(cmdName, user, ...args);
  };
}

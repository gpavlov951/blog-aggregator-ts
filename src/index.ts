import {
  Command,
  CommandsRegistry,
  handlerAddFeed,
  handlerAgg,
  handlerBrowse,
  handlerFeeds,
  handlerFollow,
  handlerFollowing,
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUnfollow,
  handlerUsers,
  registerCommand,
  runCommand,
} from "./commands";
import { middlewareLoggedIn } from "./middleware";

async function main() {
  try {
    // Create command registry
    const registry = {} as CommandsRegistry;

    // Register commands
    registerCommand(registry, "login", handlerLogin);
    registerCommand(registry, "register", handlerRegister);
    registerCommand(registry, "reset", handlerReset);
    registerCommand(registry, "users", handlerUsers);
    registerCommand(registry, "agg", handlerAgg);
    registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
    registerCommand(registry, "feeds", handlerFeeds);
    registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
    registerCommand(
      registry,
      "following",
      middlewareLoggedIn(handlerFollowing)
    );
    registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));
    registerCommand(registry, "browse", middlewareLoggedIn(handlerBrowse));

    // Get command line arguments, removing node and script path
    const args = process.argv.slice(2);

    // Check if we have at least one argument (the command)
    if (args.length === 0) {
      console.error("Error: No command provided");
      process.exit(1);
    }

    // Split into command and arguments
    const [cmdName, ...cmdArgs] = args;

    // Run the command
    await runCommand(registry, cmdName as Command, ...cmdArgs);

    process.exit(0);
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();

import {
  CommandsRegistry,
  registerCommand,
  runCommand,
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUsers,
  handlerAgg,
  Command,
} from "./commands";

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

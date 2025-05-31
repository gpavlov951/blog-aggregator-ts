import {
  CommandsRegistry,
  registerCommand,
  runCommand,
  handlerLogin,
} from "./commands";

function main() {
  try {
    // Create command registry
    const registry: CommandsRegistry = {};

    // Register commands
    registerCommand(registry, "login", handlerLogin);

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
    runCommand(registry, cmdName, ...cmdArgs);
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();

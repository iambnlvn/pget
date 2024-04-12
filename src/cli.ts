import yargs from "yargs";
import { hideBin } from "yargs/helpers";

yargs(hideBin(Bun.argv))
  .usage("pget <command> [args]")
  .version()
  .alias("v", "version")
  .command("install", "install dependencies", (argv) => {
    argv.option("production", {
      type: "boolean",
      description: "install production dependencies.",
    });
    argv.boolean("save-dev");
    argv.boolean("dev");
    argv.alias("D", "dev");
    return argv;
  })
  .command("*", "install dependencies", (argv) => {
    argv.option("production", {
      type: "boolean",
      description: "Install production only dependencies",
    });
  })
  .parse();

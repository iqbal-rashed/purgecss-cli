#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";
import chokidar from "chokidar";
import * as ora from "ora";
import { CLIOptions } from "./types";
import { buildEffectiveOptions, maybeInitConfig } from "./config";
import { runOnce } from "./prune";

program
  .name("purgecss-cli")
  .description(
    "Remove unused CSS using PurgeCSS (cosmiconfig + interactive prompts)"
  )
  .option(
    "-c, --content <globs...>",
    "Content files (html, js, tsx, vue, svelte, etc.) to scan"
  )
  .option("-s, --css <globs...>", "CSS files or globs to prune")
  .option(
    "-o, --out <dir>",
    "Output directory (defaults to overwriting input)",
    ""
  )
  .option("--tailwind", "Enable Tailwind-friendly extractor", false)
  .option(
    "--safelist <items...>",
    "Class/selector names to always keep (space/comma-separated)",
    []
  )
  .option(
    "--safelist-patterns <regex...>",
    "Regex(es) to keep, e.g. '^btn-'",
    []
  )
  .option(
    "--rejected",
    "Write a .rejected.txt file listing removed selectors",
    false
  )
  .option("--dry-run", "Don't write files; just report sizes", false)
  .option("--minify", "Minify output CSS (uses CSSO)", false)
  .option(
    "--backup",
    "Create a one-time *.bak for each CSS file before first overwrite",
    false
  )
  .option("--watch", "Watch content/CSS and re-run pruning on change", false)
  .option(
    "--report <file>",
    "Write a JSON report with stats/rejected (e.g. reports/prune.json)"
  )
  .option("--config <file>", "Path to a config file (js/json/yaml)")
  .option("--init", "Create a starter purgecss-cli.config.json in cwd", false)
  .option("--verbose", "Extra logging", false)
  .showHelpAfterError(true);

program.parse(process.argv);
const opts = program.opts<CLIOptions>();

const spinner = (ora.default || ora)({ spinner: "dots" });

(async () => {
  try {
    if (opts.init) {
      await maybeInitConfig();
      return;
    }

    const effective = await buildEffectiveOptions(opts as CLIOptions);

    if (effective.watch) {
      console.log(chalk.cyan("Watch mode enabled."));
      const watchGlobs = [...effective.content, ...effective.css];
      const watcher = chokidar.watch(watchGlobs, { ignoreInitial: true });
      let running = false;
      let rerunQueued = false;

      const trigger = async (evt: string, file: string) => {
        if (running) {
          rerunQueued = true;
          return;
        }
        running = true;
        spinner.start(`Change detected (${evt}: ${file}). Pruning.`);
        try {
          await runOnce(effective, {
            reportPath: opts.report,
            verbose: opts.verbose,
          });
          spinner.succeed("Prune complete.");
        } catch (e: any) {
          spinner.fail("Prune failed.");
          console.error(chalk.red(e?.message || e));
        } finally {
          running = false;
          if (rerunQueued) {
            rerunQueued = false;
            trigger("queued", "multiple files");
          }
        }
      };

      watcher
        .on("add", (f) => trigger("add", f))
        .on("change", (f) => trigger("change", f))
        .on("unlink", (f) => trigger("unlink", f));

      await runOnce(effective, {
        reportPath: opts.report,
        verbose: opts.verbose,
      });
      console.log(chalk.gray("Watching for changes. Press Ctrl+C to exit."));
    } else {
      spinner.start("Pruning CSS.");
      await runOnce(effective, {
        reportPath: opts.report,
        verbose: opts.verbose,
      });
      spinner.succeed("Done.");
    }
  } catch (err: any) {
    spinner.stop();
    console.error(chalk.red("Error:"), err?.message || err);
    process.exit(1);
  }
})();

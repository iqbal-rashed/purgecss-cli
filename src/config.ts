import path from "path";
import chalk from "chalk";
import { cosmiconfig } from "cosmiconfig";
import prompts from "prompts";
import { CLIOptions, Config } from "./types.ts";
import {
  ensureDir,
  parseCSVish,
  readJsonIfExists,
  writeJson,
} from "./utils.ts";

export async function maybeInitConfig() {
  const target = path.resolve(process.cwd(), "prune-css.config.json");
  const exists = await readJsonIfExists(target);
  if (exists) {
    console.log(chalk.yellow("prune-css.config.json already exists."));
    return;
  }
  const sample: Required<Config> = {
    content: ["src/**/*.{html,js,jsx,ts,tsx,vue,svelte,md,mdx}"],
    css: ["dist/**/*.css"],
    out: "pruned/",
    tailwind: false,
    safelist: [],
    safelistPatterns: ["^btn-", "^(enter|leave)-"],
    rejected: true,
    minify: true,
    dryRun: false,
    backup: false,
    report: "reports/prune.json",
    watch: false,
  };
  await writeJson(target, sample);
  console.log(chalk.green("Created prune-css.config.json"));
}

export async function loadConfigWithCosmiconfig(cli: CLIOptions) {
  const explorer = cosmiconfig("prune-css");
  if (cli.config) {
    const abs = path.resolve(process.cwd(), cli.config);
    return explorer.load(abs);
  }
  return explorer.search(process.cwd());
}

export function mergeConfig(
  base: Config,
  fromCfg: Partial<Config> | undefined
): Config {
  const merged: Config = { ...base, ...(fromCfg || {}) };
  merged.content = parseCSVish(merged.content);
  merged.css = parseCSVish(merged.css);
  merged.safelist = parseCSVish(merged.safelist);
  merged.safelistPatterns = parseCSVish(merged.safelistPatterns);
  return merged;
}

export function assertRequired(cfg: Config): asserts cfg is Required<Config> {
  if (!cfg.content || cfg.content.length === 0) {
    console.error(chalk.red("No content globs provided."));
    process.exit(2);
  }
  if (!cfg.css || cfg.css.length === 0) {
    console.error(chalk.red("No CSS globs provided."));
    process.exit(2);
  }
}

export async function promptForMissing(current: Config): Promise<Config> {
  const needContent = !current.content || current.content.length === 0;
  const needCss = !current.css || current.css.length === 0;

  if (!needContent && !needCss) return current;

  console.log(chalk.cyan("Interactive setup - missing required options."));
  const answers: { content?: string; css?: string } = await prompts(
    [
      needContent && {
        type: "text",
        name: "content",
        message: "Content globs (space/comma separated)",
        initial: "src/**/*.{html,js,jsx,ts,tsx,vue,svelte,md,mdx}",
      },
      needCss && {
        type: "text",
        name: "css",
        message: "CSS globs (space/comma separated)",
        initial: "dist/**/*.css",
      },
    ].filter(Boolean) as prompts.PromptObject[]
  );

  return {
    ...current,
    ...(answers.content ? { content: parseCSVish(answers.content) } : {}),
    ...(answers.css ? { css: parseCSVish(answers.css) } : {}),
  };
}

export async function buildEffectiveOptions(
  cli: CLIOptions
): Promise<Required<Config>> {
  let effective: Config = { ...cli };

  const result = await loadConfigWithCosmiconfig(cli);
  if (result && result.config) {
    console.log(chalk.gray(`Loaded config from ${result.filepath}`));
    effective = mergeConfig(result.config as Partial<Config>, effective);
  } else {
    effective = mergeConfig({}, effective);
  }

  effective = await promptForMissing(effective);
  assertRequired(effective);

  return {
    content: effective.content!,
    css: effective.css!,
    out: effective.out ?? "",
    tailwind: effective.tailwind ?? false,
    safelist: parseCSVish(effective.safelist),
    safelistPatterns: parseCSVish(effective.safelistPatterns),
    rejected: effective.rejected ?? false,
    dryRun: effective.dryRun ?? false,
    minify: effective.minify ?? false,
    backup: effective.backup ?? false,
    watch: effective.watch ?? false,
    report: effective.report ?? "",
  };
}

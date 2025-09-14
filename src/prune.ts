import fg from "fast-glob";
import { PurgeCSS } from "purgecss";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import * as csso from "csso";
import { Config, RunReport } from "./types.ts";
import {
  backupOnce,
  buildSafelist,
  ensureDir,
  formatSize,
  tailwindExtractor,
  writeJson,
} from "./utils.ts";

/** Return file paths (strings) - matches PurgeCSS's `content: string[]` */
export async function readContentFiles(
  contentGlobs: string[]
): Promise<string[]> {
  const files = await fg(contentGlobs, {
    dot: true,
    onlyFiles: true,
    unique: true,
  });
  if (files.length === 0) throw new Error("No content files matched.");
  return files; // strings, not objects
}

export async function pruneCssForFile(
  cssFile: string,
  content: string[],
  options: {
    tailwind?: boolean;
    safelist: string[];
    safelistPatterns: RegExp[];
  }
) {
  const purge = new PurgeCSS();
  const res = await purge.purge({
    content,
    css: [cssFile],
    safelist: {
      standard: options.safelist,
      deep: options.safelistPatterns,
      greedy: [],
    },
    extractors: options.tailwind
      ? [
          {
            extractor: tailwindExtractor,
            extensions: [
              "html",
              "js",
              "jsx",
              "ts",
              "tsx",
              "md",
              "mdx",
              "svelte",
              "vue",
            ],
          },
        ]
      : [],
    rejected: true,
  });
  return res[0] as { css: string; file: string; rejected?: string[] };
}

export async function runOnce(
  effectiveOpts: Required<Config>,
  opts?: { reportPath?: string; verbose?: boolean }
): Promise<RunReport> {
  const start = Date.now();
  const report: RunReport = {
    runAt: new Date().toISOString(),
    files: [],
    totals: { before: 0, after: 0, saved: 0 },
  };

  const cssFiles = await fg(effectiveOpts.css, {
    dot: true,
    onlyFiles: true,
    unique: true,
  });
  if (cssFiles.length === 0) throw new Error("No CSS files matched.");

  const content = await readContentFiles(effectiveOpts.content);
  const { safelist, safelistPatterns } = buildSafelist(effectiveOpts);
  if (effectiveOpts.out) await ensureDir(effectiveOpts.out);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const cssFile of cssFiles) {
    const originalCss = await fs.readFile(cssFile, "utf8");
    const before = Buffer.byteLength(originalCss, "utf8");
    totalBefore += before;

    const result = await pruneCssForFile(cssFile, content, {
      tailwind: effectiveOpts.tailwind,
      safelist,
      safelistPatterns,
    });

    let finalCss = result.css || "";
    if (effectiveOpts.minify) {
      const min = csso.minify(finalCss, { restructure: true });
      finalCss = min.css;
    }

    const after = Buffer.byteLength(finalCss, "utf8");
    totalAfter += after;

    const outPath = effectiveOpts.out
      ? path.join(effectiveOpts.out, path.basename(cssFile))
      : cssFile;

    if (effectiveOpts.rejected && result.rejected && result.rejected.length) {
      const rejPath = outPath + ".rejected.txt";
      const sorted = [...new Set(result.rejected)].sort().join("\n");
      if (!effectiveOpts.dryRun) await fs.writeFile(rejPath, sorted, "utf8");
      if (opts?.verbose) {
        console.log(
          chalk.gray(`Rejected list -> ${rejPath} (${result.rejected.length})`)
        );
      }
    }

    if (!effectiveOpts.dryRun) {
      await ensureDir(path.dirname(outPath));
      if (effectiveOpts.backup && !effectiveOpts.out) await backupOnce(cssFile);
      await fs.writeFile(outPath, finalCss, "utf8");
    }

    const delta = before - after;
    console.log(
      `${chalk.cyan(path.basename(cssFile))}: ${formatSize(
        before
      )} → ${formatSize(after)} ${chalk.green(`(-${formatSize(delta)})`)}`
    );

    report.files.push({
      file: cssFile,
      out: outPath,
      beforeBytes: before,
      afterBytes: after,
      savedBytes: delta,
      rejectedCount: result.rejected?.length ?? 0,
    });
  }

  report.totals.before = totalBefore;
  report.totals.after = totalAfter;
  report.totals.saved = totalBefore - totalAfter;

  const ms = Date.now() - start;
  if (cssFiles.length > 1) {
    console.log(
      chalk.bold(
        `Total: ${formatSize(totalBefore)} → ${formatSize(
          totalAfter
        )} ${chalk.green(
          `(-${formatSize(totalBefore - totalAfter)})`
        )} in ${ms}ms`
      )
    );
  } else {
    console.log(chalk.gray(`Done in ${ms}ms.`));
  }

  if (opts?.reportPath) {
    await writeJson(path.resolve(process.cwd(), opts.reportPath), report);
    console.log(chalk.gray(`Report written → ${opts.reportPath}`));
  }

  return report;
}

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { Config, StrOrArr } from "./types";

export const tailwindExtractor = (content: string): string[] =>
  content.match(/[\w-:/%.]+(?<!:)/g) || [];

export function parseCSVish(input: StrOrArr): string[] {
  if (!input) return [];
  const s = Array.isArray(input) ? input.join(" ") : String(input);
  return s
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function ensureDir(dir?: string) {
  if (dir) await fs.mkdir(dir, { recursive: true }).catch(() => {});
}

export async function readJsonIfExists<T = unknown>(
  file: string
): Promise<T | null> {
  try {
    const txt = await fs.readFile(file, "utf8");
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

export async function writeJson(file: string, data: unknown) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

export function buildSafelist(options: Config) {
  const exact = parseCSVish(options.safelist);
  const patterns = parseCSVish(options.safelistPatterns);
  const regexes = (patterns || [])
    .map((r) => {
      try {
        if (r.startsWith("/") && r.lastIndexOf("/") > 0) {
          const last = r.lastIndexOf("/");
          return new RegExp(r.slice(1, last), r.slice(last + 1));
        }
        return new RegExp(r);
      } catch {
        console.error(chalk.yellow(`Warning: bad regex "${r}" ignored`));
        return null;
      }
    })
    .filter((x): x is RegExp => !!x);
  return { safelist: exact, safelistPatterns: regexes };
}

export async function backupOnce(pathToFile: string) {
  try {
    const bak = pathToFile + ".bak";
    const exists = await fs
      .access(bak)
      .then(() => true)
      .catch(() => false);
    if (!exists) await fs.copyFile(pathToFile, bak);
  } catch {}
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { Config, StrOrArr } from "./types";

export const tailwindExtractor = (content: string): string[] =>
  content.match(/[\w-:/%.]+(?<!:)/g) || [];

export function parseCSVish(input: StrOrArr): string[] {
  if (!input) return [];
  // If already an array, just trim entries without further splitting.
  if (Array.isArray(input)) return input.map((x) => String(x).trim()).filter(Boolean);

  // Split a single string by commas or whitespace, but do not split inside
  // brace-expansions like **/*.{html,js}. This allows glob patterns to remain intact.
  const s = String(input);
  const parts: string[] = [];
  let buf = "";
  let braceDepth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") {
      braceDepth++;
      buf += ch;
      continue;
    }
    if (ch === "}" && braceDepth > 0) {
      braceDepth--;
      buf += ch;
      continue;
    }
    // Treat comma or whitespace as delimiters only when not inside braces
    if (braceDepth === 0 && (ch === "," || /\s/.test(ch))) {
      if (buf.trim()) parts.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
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

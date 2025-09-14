# purgecss-cli

Remove unused CSS from your project with a fast **CommonJS** CLI.  
Zero‑config via **cosmiconfig**, smart **Tailwind** extraction, **minify**, **watch**, **reports**, and friendly **interactive prompts** (only when `--content` / `--css` are missing).

---

## ✨ Features

- **Dead‑CSS removal** via PurgeCSS (battle‑tested)
- **CommonJS CLI** (no ESM required)
- **cosmiconfig** support  
  _Auto‑discovers config from `package.json`, `.purgecss-clirc.*`, `purgecss-cli.config.*`_
- **Interactive prompts** (asks for `content` & `css` only if missing)
- **Tailwind‑aware** extractor (handles variants & arbitrary values)
- **Minify** output with CSSO (`--minify`)
- **Watch mode** (`--watch`)
- **JSON reports** (`--report`)
- **Backups** (`--backup`) of originals
- **Safelisting** (exact & regex)
- **Rejected list** per file (`--rejected` → `*.rejected.txt`)

---

## 🧭 Installation

```bash
# local dev dependency
npm i -D purgecss-cli

# or global for quick use
npm i -g purgecss-cli
```

## 🚀 Quick Start

```bash
# If your config already defines content/css, this just runs:
npx purgecss-cli

# Or pass globs explicitly:
npx purgecss-cli \
  -c "src/**/*.{html,js,jsx,ts,tsx,vue,svelte,md,mdx}" \
  -s "dist/**/*.css" \
  --tailwind --minify --rejected
```

If `--content` or `--css` are missing, the CLI will **prompt** for them.

---

## 📦 Configuration (cosmiconfig)

`purgecss-cli` loads config from any of these (first match wins):

- `package.json` → `"purgecss-cli": { ... }`
- `.purgecss-clirc` / `.purgecss-clirc.{json,yaml,yml,js,cjs}`
- `purgecss-cli.config.{js,cjs,json,yaml,yml}`

### Example (JSON)

```json
{
  "content": ["src/**/*.{html,js,jsx,ts,tsx,vue,svelte,md,mdx}"],
  "css": ["dist/**/*.css"],
  "tailwind": true,
  "minify": true,
  "rejected": true,
  "safelist": ["modal-open", "prose"],
  "safelistPatterns": ["^btn-", "^(enter|leave)-"],
  "out": "pruned/",
  "report": "reports/prune.json"
}
```

> **CLI flags override** values from config.

---

## 🧪 Common Commands

```bash
# Initialize a sample config file in the current directory
npx purgecss-cli --init

# Basic run (no prompts if config covers it)
npx purgecss-cli

# Explicit globs + Tailwind extractor + minify
npx purgecss-cli -c "src/**/*.{html,tsx}" -s "dist/**/*.css" --tailwind --minify

# Output to a different folder (keeps filenames)
npx purgecss-cli -c "src/**/*.{html,tsx}" -s "dist/**/*.css" -o pruned/

# Keep certain classes always
npx purgecss-cli -c "src/**/*" -s "dist/**/*.css" --safelist modal-open prose

# Keep classes by regex (e.g., keep all btn-* and text-*)
npx purgecss-cli -c "src/**/*" -s "dist/**/*.css" --safelist-patterns "^btn-" "^text-"

# Inspect removed selectors (writes .rejected.txt next to outputs)
npx purgecss-cli -c "src/**/*" -s "dist/**/*.css" --rejected

# JSON report with size savings per file
npx purgecss-cli -c "src/**/*" -s "dist/**/*.css" --report reports/run.json

# Watch for changes and re-run automatically
npx purgecss-cli -c "src/**/*" -s "dist/**/*.css" --watch

# Dry run: calculate savings without writing files
npx purgecss-cli -c "src/**/*" -s "dist/**/*.css" --dry-run
```

---

## 🧵 Tailwind Notes

- Enable Tailwind parsing with `--tailwind` (or `tailwind: true` in config).
- The built‑in extractor handles variants like `md:hover:underline` and arbitrary values like `w-[37%]`.
- **Dynamic classes** (e.g., `className={"btn-" + size}`) aren’t visible to static analysis—use **safelist**:
  - Exact: `--safelist btn-sm btn-lg`
  - Regex: `--safelist-patterns "^btn-"`

---

## 🔒 Safelisting Basics

- **Exact classes**: `--safelist modal-open prose`
- **Regex patterns**: `--safelist-patterns "^toast-" "^(enter|leave)-"`
- In config, you can provide arrays:
  ```json
  { "safelist": ["modal-open"], "safelistPatterns": ["^btn-"] }
  ```

---

## 🗂 Output, Backups & Reports

- **Overwrite in place** by default.
- **Output to a folder** with `-o pruned/`.
- **Back up originals** (only when overwriting in place) with `--backup` → saves `*.bak`.
- **Rejected selectors** (`--rejected`) → writes `filename.css.rejected.txt`.
- **JSON report** (`--report path.json`) includes per‑file before/after/saved bytes and rejected counts.

---

## 👀 Watch Mode

```bash
npx purgecss-cli -c "app/**/*.{tsx,html}" -s ".next/static/css/*.css" --tailwind --watch
```

Watches both content & CSS globs. On change, re‑runs pruning (debounced).

---

## 🧰 CI / Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "prune:css": "purgecss-cli --minify --rejected --report reports/prune.json"
  }
}
```

Then:

```bash
npm run prune:css
```

Use in CI after your build step, before packaging artifacts.

---

## 🧯 Troubleshooting (CJS)

**ESM‑only dependency error (e.g., chalk, cosmiconfig, ora)**

- Prefer CJS‑friendly versions: `chalk@4`, `cosmiconfig@8`, `ora@5`.
- Or dynamically import ESM at runtime in CJS (advanced).

**Classes missing after prune**  
Safelist dynamic/conditionally built classes via `--safelist` / `--safelist-patterns`. Check the `*.rejected.txt` file to see what got removed.

**No files matched**  
Wrap globs in quotes so your shell doesn’t expand them early:

```
-c "src/**/*.{html,tsx}" -s "dist/**/*.css"
```

**Tailwind JIT**  
Point `content` globs at your **source** files (where class names live), not just compiled HTML.

---

## 📚 Options Reference

| Flag                  | Type               | Description                                                              |
| --------------------- | ------------------ | ------------------------------------------------------------------------ |
| `-c, --content`       | `string[]`         | **Required** globs of files to scan (HTML/JS/TS/MD/MDX/Vue/Svelte, etc.) |
| `-s, --css`           | `string[]`         | **Required** CSS file globs to prune                                     |
| `-o, --out`           | `string`           | Output directory (default overwrites in place)                           |
| `--tailwind`          | `boolean`          | Enable Tailwind‑aware extraction                                         |
| `--safelist`          | `string[]`         | Always keep these class/selector names                                   |
| `--safelist-patterns` | `string[]` (regex) | Regex keep rules (e.g., `^btn-`)                                         |
| `--rejected`          | `boolean`          | Write `*.rejected.txt` with removed selectors                            |
| `--dry-run`           | `boolean`          | Don’t write files; just show stats                                       |
| `--minify`            | `boolean`          | Minify output CSS using CSSO                                             |
| `--backup`            | `boolean`          | Create `*.bak` next to original (in‑place only)                          |
| `--watch`             | `boolean`          | Re‑run on changes to content/CSS                                         |
| `--report`            | `string`           | Write a JSON report with per‑file stats                                  |
| `--config`            | `string`           | Explicit path to config file                                             |
| `--init`              | `boolean`          | Create `purgecss-cli.config.json` scaffold                               |
| `--verbose`           | `boolean`          | Extra logging                                                            |

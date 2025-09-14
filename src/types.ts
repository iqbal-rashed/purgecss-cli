export type StrOrArr = string | string[] | undefined;

export type Config = {
  content?: string[];
  css?: string[];
  out?: string;
  tailwind?: boolean;
  safelist?: string[] | string;
  safelistPatterns?: string[] | string;
  rejected?: boolean;
  dryRun?: boolean;
  minify?: boolean;
  backup?: boolean;
  watch?: boolean;
  report?: string;
};

export type CLIOptions = Config & {
  config?: string;
  init?: boolean;
  verbose?: boolean;
};

export type RunReport = {
  runAt: string;
  files: Array<{
    file: string;
    out: string;
    beforeBytes: number;
    afterBytes: number;
    savedBytes: number;
    rejectedCount: number;
  }>;
  totals: { before: number; after: number; saved: number };
};


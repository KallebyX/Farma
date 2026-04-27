/**
 * Run with `pnpm check:env`. Loads `.env.local` (or `.env`), validates, and
 * exits non-zero if there are errors. Useful as a pre-deploy safety check.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { checkEnv } from "../lib/env";

const ENV_CANDIDATES = [".env.production.local", ".env.local", ".env"];

function loadDotenv() {
  for (const name of ENV_CANDIDATES) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const [, key, rawVal] = m;
      if (process.env[key] !== undefined) continue;
      let val = rawVal.trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
    return name;
  }
  return null;
}

const loaded = loadDotenv();
if (loaded) console.log(`Loaded ${loaded}`);

const result = checkEnv();

if (result.warnings.length > 0) {
  console.log("\n⚠ Warnings:");
  for (const w of result.warnings) console.log(`  · ${w}`);
}

if (!result.ok) {
  console.error("\n✗ Environment validation FAILED:");
  for (const err of result.errors) console.error(`  · ${err}`);
  process.exit(1);
}

console.log("\n✓ Environment validation passed.");

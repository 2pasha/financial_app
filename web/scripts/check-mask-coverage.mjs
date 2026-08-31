#!/usr/bin/env node
/**
 * Session-replay masking drift guard.
 *
 * Amounts are rendered by hand in a dozen components (three separate
 * `formatAmount` helpers plus inline `toLocaleString()`), so the list of masked
 * surfaces in lib/privacy.ts is maintained by hand and will drift the moment
 * someone adds a component that renders money.
 *
 * This catches exactly that: a file that formats money but never mentions MASK.
 * It is deliberately crude — a false positive is fixed by adding the class where
 * it belongs, or by adding the file to ALLOWLIST with a reason.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');

/** Files that format money but genuinely need no mask, with the reason why. */
const ALLOWLIST = new Map([
  ['lib/ai-export.ts', 'builds a string for the clipboard; never rendered to the DOM'],
  ['components/ui/chart.tsx', 'shadcn primitive; masking belongs on the chart container'],
]);

const MONEY = /formatAmount\(|toLocaleString\(|Intl\.NumberFormat/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.tsx?$/.test(path)) yield path;
  }
}

const offenders = [];

for (const path of walk(SRC)) {
  const rel = relative(SRC, path);
  if (ALLOWLIST.has(rel)) continue;

  const source = readFileSync(path, 'utf8');
  if (MONEY.test(source) && !source.includes('MASK')) offenders.push(rel);
}

if (offenders.length) {
  console.error('Unmasked money surfaces — session replay would record these in the clear:\n');
  for (const file of offenders) console.error(`  src/${file}`);
  console.error('\nAdd the MASK class from src/lib/privacy.ts to the container that renders');
  console.error('the amount, or allowlist the file in scripts/check-mask-coverage.mjs.');
  process.exit(1);
}

console.log('Mask coverage OK — every money-rendering module references MASK.');

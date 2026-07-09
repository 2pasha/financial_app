/**
 * One-time cleanup: removes duplicate Transaction rows that represent the same
 * real Monobank transaction stored under different `monobankId`s.
 *
 * Duplicates are grouped by the natural key that the webhook dedup now uses:
 *   accountId + amount + mcc + description + exact time
 * Using the EXACT time (not a window) is deliberate — it keeps legitimately
 * distinct repeat purchases (e.g. two identical transit fares an hour apart)
 * in separate groups so they are never merged.
 *
 * Within each duplicate group one row is kept:
 *   1. prefer a settled row (hold = false) over a pending one (hold = true)
 *   2. then the most recently created row (createdAt)
 * The rest are deleted.
 *
 * Dry-run by default (prints what it WOULD delete). Pass --apply to delete.
 *   npx ts-node scripts/dedupe-transactions.ts            # preview
 *   npx ts-node scripts/dedupe-transactions.ts --apply    # delete
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

type Row = {
  id: string;
  accountId: string;
  monobankId: string;
  amount: bigint;
  mcc: number | null;
  description: string;
  time: Date;
  hold: boolean;
  createdAt: Date;
};

function groupKey(row: Row): string {
  return [
    row.accountId,
    row.amount.toString(),
    row.mcc ?? 'null',
    row.time.toISOString(),
    row.description,
  ].join('|');
}

// Order rows best-to-keep first: settled before hold, then newest createdAt.
function keepFirst(a: Row, b: Row): number {
  if (a.hold !== b.hold) {
    return a.hold ? 1 : -1;
  }

  return b.createdAt.getTime() - a.createdAt.getTime();
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();

  try {
    const rows = (await prisma.transaction.findMany({
      select: {
        id: true,
        accountId: true,
        monobankId: true,
        amount: true,
        mcc: true,
        description: true,
        time: true,
        hold: true,
        createdAt: true,
      },
    })) as Row[];

    console.log(`Scanned ${rows.length} transaction(s)`);

    const groups = new Map<string, Row[]>();
    for (const row of rows) {
      const key = groupKey(row);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(row);
      } else {
        groups.set(key, [row]);
      }
    }

    const idsToDelete: string[] = [];
    let duplicateGroups = 0;

    for (const bucket of groups.values()) {
      if (bucket.length < 2) {
        continue;
      }

      duplicateGroups++;
      const [keep, ...remove] = [...bucket].sort(keepFirst);
      console.log(
        `Group (${remove.length} dup): keep ${keep.monobankId} (hold=${keep.hold}), ` +
          `delete ${remove.map((r) => r.monobankId).join(', ')}`,
      );
      idsToDelete.push(...remove.map((r) => r.id));
    }

    console.log(
      `Found ${duplicateGroups} duplicate group(s), ${idsToDelete.length} row(s) to delete`,
    );

    if (idsToDelete.length === 0) {
      console.log('Nothing to do.');
      return;
    }

    if (!apply) {
      console.log('\nDRY RUN — no rows deleted. Re-run with --apply to delete.');
      return;
    }

    const result = await prisma.transaction.deleteMany({
      where: { id: { in: idsToDelete } },
    });
    console.log(`Deleted ${result.count} duplicate row(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

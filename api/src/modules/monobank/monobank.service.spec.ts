import { MonobankService } from './monobank.service';
import type {
  MonobankWebhookPayload,
  MonobankWebhookStatementItem,
} from './interfaces/monobank-webhook.interface';

/**
 * These tests focus on webhook duplicate handling: the per-account serialization
 * queue and the deleteSupersededDuplicate matching. A minimal in-memory fake of
 * prisma.transaction implements the exact query shapes the service uses so the
 * real WHERE semantics are exercised.
 */

const ACCOUNT_ID = 'db-account-1';
const MONO_ACCOUNT_ID = 'mono-account-1';
const USER_ID = 'user-1';

type FakeRow = {
  id: string;
  userId: string;
  accountId: string;
  monobankId: string;
  time: Date;
  description: string;
  amount: bigint;
  mcc: number | null;
  hold: boolean;
  createdAt: Date;
};

function matchesWhere(row: FakeRow, where: any): boolean {
  const scalar = (field: keyof FakeRow, cond: any): boolean => {
    if (cond === undefined) return true;
    if (cond !== null && typeof cond === 'object') {
      if ('not' in cond) return row[field] !== cond.not;
      if ('gte' in cond || 'lte' in cond) {
        const t = (row[field] as Date).getTime();
        if ('gte' in cond && t < (cond.gte as Date).getTime()) return false;
        if ('lte' in cond && t > (cond.lte as Date).getTime()) return false;
        return true;
      }
    }
    if (cond instanceof Date) return (row[field] as Date).getTime() === cond.getTime();
    return row[field] === cond;
  };

  if (!scalar('accountId', where.accountId)) return false;
  if (!scalar('amount', where.amount)) return false;
  if (!scalar('mcc', where.mcc)) return false;
  if (!scalar('description', where.description)) return false;
  if (!scalar('monobankId', where.monobankId)) return false;
  if (!scalar('time', where.time)) return false;
  if (!scalar('hold', where.hold)) return false;

  if (Array.isArray(where.OR)) {
    return where.OR.some((clause: any) =>
      Object.keys(clause).every((k) => scalar(k as keyof FakeRow, clause[k])),
    );
  }

  return true;
}

function buildFakePrisma(rows: FakeRow[]) {
  let seq = 0;

  return {
    rows,
    account: {
      findFirst: jest.fn(async () => ({
        id: ACCOUNT_ID,
        accountId: MONO_ACCOUNT_ID,
        userId: USER_ID,
        currency: 980,
      })),
    },
    transaction: {
      deleteMany: jest.fn(async ({ where }: any) => {
        const kept = rows.filter((r) => !matchesWhere(r, where));
        const count = rows.length - kept.length;
        rows.length = 0;
        rows.push(...kept);
        return { count };
      }),
      upsert: jest.fn(async ({ where, update, create }: any) => {
        const existing = rows.find((r) => r.monobankId === where.monobankId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row: FakeRow = {
          id: `row-${++seq}`,
          createdAt: new Date(1_700_000_000_000 + seq),
          ...create,
        };
        rows.push(row);
        return row;
      }),
    },
  };
}

function buildService(prisma: any): MonobankService {
  const categoriesService = {
    getCategoriesWithMccCodes: jest.fn(async () => []),
  };

  return new MonobankService(
    prisma as any,
    {} as any, // monobankApi
    {} as any, // crypto
    {} as any, // config
    {} as any, // syncJobStore
    categoriesService as any,
  );
}

function statementItem(
  overrides: Partial<MonobankWebhookStatementItem> = {},
): MonobankWebhookStatementItem {
  return {
    id: 'tx-a',
    time: 1_711_000_000,
    description: 'COFFEE SHOP',
    mcc: 5814,
    amount: -8000,
    operationAmount: -8000,
    currencyCode: 980,
    commissionRate: 0,
    cashbackAmount: 0,
    balance: 100000,
    hold: false,
    ...overrides,
  };
}

function payload(item: MonobankWebhookStatementItem): MonobankWebhookPayload {
  return { type: 'StatementItem', data: { account: MONO_ACCOUNT_ID, statementItem: item } };
}

describe('MonobankService webhook dedup', () => {
  it('collapses a re-issued settled item that shares the exact same time', async () => {
    const rows: FakeRow[] = [];
    const prisma = buildFakePrisma(rows);
    const service = buildService(prisma);

    await service.handleWebhook(payload(statementItem({ id: 'tx-a', hold: false })));
    await service.handleWebhook(payload(statementItem({ id: 'tx-b', hold: false })));

    expect(rows).toHaveLength(1);
    expect(rows[0].monobankId).toBe('tx-b');
  });

  it('settled item supersedes an earlier pending hold with the same time', async () => {
    const rows: FakeRow[] = [];
    const prisma = buildFakePrisma(rows);
    const service = buildService(prisma);

    await service.handleWebhook(payload(statementItem({ id: 'hold-1', hold: true })));
    await service.handleWebhook(payload(statementItem({ id: 'settled-1', hold: false })));

    expect(rows).toHaveLength(1);
    expect(rows[0].monobankId).toBe('settled-1');
    expect(rows[0].hold).toBe(false);
  });

  it('does NOT merge two distinct purchases at different times (no data loss)', async () => {
    const rows: FakeRow[] = [];
    const prisma = buildFakePrisma(rows);
    const service = buildService(prisma);

    // Two identical transit fares an hour apart — legitimately separate.
    await service.handleWebhook(
      payload(statementItem({ id: 'ride-1', time: 1_711_000_000, hold: false })),
    );
    await service.handleWebhook(
      payload(statementItem({ id: 'ride-2', time: 1_711_003_600, hold: false })),
    );

    expect(rows).toHaveLength(2);
  });

  it('serializes concurrent webhooks for the same account (no duplicate race)', async () => {
    const rows: FakeRow[] = [];
    const prisma = buildFakePrisma(rows);
    const service = buildService(prisma);

    // Fire both without awaiting the first — the queue must still process them in order.
    const p1 = service.handleWebhook(payload(statementItem({ id: 'tx-a', hold: false })));
    const p2 = service.handleWebhook(payload(statementItem({ id: 'tx-b', hold: false })));
    await Promise.all([p1, p2]);

    expect(rows).toHaveLength(1);
    expect(rows[0].monobankId).toBe('tx-b');
  });

  it('ignores non-StatementItem payloads', async () => {
    const rows: FakeRow[] = [];
    const prisma = buildFakePrisma(rows);
    const service = buildService(prisma);

    await service.handleWebhook({
      type: 'Ping',
      data: { account: MONO_ACCOUNT_ID, statementItem: statementItem() },
    } as any);

    expect(prisma.transaction.upsert).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });
});

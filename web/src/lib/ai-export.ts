import { categoriesApi, incomeApi, budgetPlansApi } from './api-client';
import { translations, type Language } from './translations';

export interface MonthSnapshotCategory {
  name: string;
  icon: string;
  /** Planned budget for the month; null when a plan exists and the category is not part of it */
  planned: number | null;
  spent: number;
  net: number;
  excludeFromDashboard: boolean;
}

export interface MonthSnapshot {
  year: number;
  month: number;
  totalIncome: number;
  categories: MonthSnapshotCategory[];
  plannedTotal: number;
  actualTotal: number;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

export function monthLabelEn(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
}

function monthRange(year: number, month: number): { from: string; to: string } {
  return {
    from: new Date(year, month - 1, 1).toISOString(),
    to: new Date(year, month, 0, 23, 59, 59, 999).toISOString(),
  };
}

/** Category names are stored as translation keys for default categories; export them in English */
function categoryNameEn(name: string): string {
  return (translations.en as Record<string, string>)[name] || name;
}

export async function fetchMonthSnapshot(year: number, month: number): Promise<MonthSnapshot> {
  const [categories, incomeItems, plan] = await Promise.all([
    categoriesApi.getAll({ ...monthRange(year, month), calendarYear: year, calendarMonth: month }),
    incomeApi.getAll({ year, month }),
    budgetPlansApi.getForMonth(year, month).catch(() => null),
  ]);

  const planBudgets = plan
    ? new Map(plan.items.map((item) => [item.categoryId, item.budget]))
    : null;

  // Mirrors the dashboard's planned/unplanned split: with a plan, a category is
  // planned when it's in the plan or is a one-month category for this month.
  const isPlanned = (cat: { id: string; year: number | null; month: number | null }) =>
    !planBudgets ||
    planBudgets.has(cat.id) ||
    (cat.year === year && cat.month === month);

  const snapshotCategories: MonthSnapshotCategory[] = categories.map((cat) => {
    const budget = planBudgets?.get(cat.id) ?? cat.budget;

    return {
      name: categoryNameEn(cat.name),
      icon: cat.icon,
      planned: isPlanned(cat) ? budget : null,
      spent: cat.spent,
      net: cat.net,
      excludeFromDashboard: cat.excludeFromDashboard,
    };
  });

  const totalIncome = incomeItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const plannedTotal = snapshotCategories.reduce((sum, c) => sum + (c.planned ?? 0), 0);
  const actualTotal = Math.abs(
    snapshotCategories
      .filter((c) => !c.excludeFromDashboard)
      .reduce((sum, c) => sum + c.net, 0),
  );

  return { year, month, totalIncome, categories: snapshotCategories, plannedTotal, actualTotal };
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function buildAiPrompt(
  snapshots: MonthSnapshot[],
  options: { includeIncome: boolean; language: Language; currency: string },
): string {
  const { includeIncome, language, currency } = options;

  const ordered = [...snapshots].sort((a, b) => a.year - b.year || a.month - b.month);

  const lines: string[] = [
    'You are an experienced personal finance analyst. Below is my monthly budgeting data: planned budgets vs actual spending per category, for one or more recent months.',
    '',
    'Please analyze it and:',
    '1. Assess my overall budget health for the most recent month.',
    '2. Compare months and point out spending trends (which categories are growing or shrinking).',
    '3. Identify the categories where I overspend the most.',
    '4. Suggest 3-5 concrete, prioritized improvements to my budget.',
    '5. Flag anything unusual or worth my attention.',
    '',
    'Keep the advice practical and specific to the numbers below.',
  ];

  if (language === 'uk') {
    lines.push('Reply in Ukrainian.');
  }

  lines.push('', `All amounts are in ${currency}.`);

  ordered.forEach((snap, idx) => {
    const isLatest = idx === ordered.length - 1;
    lines.push('', `## ${monthLabelEn(snap.year, snap.month)}${isLatest ? ' (most recent)' : ''}`);

    if (includeIncome && snap.totalIncome > 0) {
      lines.push(`- Total income: ${fmt(snap.totalIncome)}`);
    }
    lines.push(
      `- Planned total: ${fmt(snap.plannedTotal)}`,
      `- Actual spent: ${fmt(snap.actualTotal)}`,
      `- Left vs plan: ${fmt(snap.plannedTotal - snap.actualTotal)}`,
    );

    const rows = snap.categories.filter((c) => (c.planned ?? 0) > 0 || c.spent !== 0 || c.net !== 0);

    if (rows.length === 0) {
      lines.push('- No category data for this month.');
      return;
    }

    lines.push('', '| Category | Planned | Spent |', '| --- | ---: | ---: |');
    for (const c of rows) {
      lines.push(`| ${c.icon} ${c.name} | ${c.planned === null ? '—' : fmt(c.planned)} | ${fmt(c.spent)} |`);
    }
  });

  return lines.join('\n');
}

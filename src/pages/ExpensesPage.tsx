import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

type MonoTxn = {
  id: string;
  time: number;
  description: string;
  mcc: number;
  originalMcc: number;
  hold: boolean | null;
  amount: number; // negative = expense in minor units (e.g., cents)
  operationAmount: number;
  currencyCode: number; // 980=UAH
  commissionRate: number | null;
  cashbackAmount: number;
  balance: number;
  comment?: string;
  receiptId?: string;
  invoiceId?: string;
  counterEdrpou?: string;
  counterIban?: string;
  counterName?: string;
};

// Popular MCC codes mapped to human-readable names (source: mcc.in.ua)
const MCC_MAP: Record<number, string> = {
  4111: 'Local/Suburban Passenger Transport',
  5812: 'Restaurants',
  5912: 'Pharmacies',
  5814: 'Fast Food Restaurants',
  5411: 'Grocery Stores, Supermarkets',
  5462: 'Bakeries',
  7832: 'Movie Theaters',
  7941: 'Sports Clubs and Promoters',
  5641: 'Children’s Clothing Stores',
  5441: 'Candy, Nut and Confectionery Stores',
  5977: 'Cosmetic Stores',
  5211: 'Lumber and Building Materials',
  5499: 'Misc. Food Stores',
  5942: 'Book Stores',
  5541: 'Service Stations',
  5995: 'Pet Shops, Pet Foods',
  8099: 'Medical Services (Not Elsewhere Classified)',
  5311: 'Department Stores',
  5200: 'Home Supply Warehouse Stores',
  5399: 'Misc. General Merchandise',
  1520: 'General Contractors – Residential/Commercial',
  5811: 'Caterers',
  4812: 'Telecom Equipment and Telephone Sales',
  5300: 'Wholesale Clubs',
  5722: 'Household Appliance Stores',
  5122: 'Drugs, Drug Proprietaries, and Druggist Sundries',
  5310: 'Discount Stores',
  5921: 'Package Stores – Beer, Wine, Liquor',
  5697: 'Tailors/Alterations',
  5661: 'Shoe Stores',
  5331: 'Variety Stores',
  4829: 'Money Transfers',
  6012: 'Financial Institutions – Merchandise and Services',
};

async function loadMccCatalog(): Promise<Record<number, string>> {
  try {
    const res = await fetch('/mcc.json');
    if (!res.ok) return {};
    const json = await res.json() as Record<string, string>;
    const normalized: Record<number, string> = {};
    for (const [k, v] of Object.entries(json)) {
      const code = Number(k);
      if (!Number.isNaN(code)) normalized[code] = v;
    }
    return normalized;
  } catch {
    return {};
  }
}

function mccName(mcc: number, catalog: Record<number, string>) {
  const name = catalog[mcc] || MCC_MAP[mcc];
  return name ? `${mcc} • ${name}` : `MCC ${mcc}`;
}

function mccUrl(mcc: number) {
  return `https://mcc.in.ua/ua/mccs#${mcc}`;
}

function formatDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toUnix(dateStr: string) {
  return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000);
}

function currencySymbolFromCode(code: number) {
  switch (code) {
    case 980: return '₴'; // UAH
    case 840: return '$'; // USD
    case 978: return '€'; // EUR
    case 826: return '£'; // GBP
    default: return '';
  }
}

export default function ExpensesPage() {
  const [account, setAccount] = useState<string>(() => localStorage.getItem('monoAccount') || '');
  const [from, setFrom] = useState<string>(() => localStorage.getItem('monoFrom') || formatDateInput(new Date(Date.now() - 7 * 24 * 3600 * 1000)));
  const [to, setTo] = useState<string>(() => localStorage.getItem('monoTo') || formatDateInput(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txns, setTxns] = useState<MonoTxn[]>([]);
  const [mccCatalog, setMccCatalog] = useState<Record<number, string>>({});

  useEffect(() => {
    loadMccCatalog().then(setMccCatalog);
  }, []);
  useEffect(() => {
    localStorage.setItem('monoAccount', account);
  }, [account]);
  useEffect(() => {
    localStorage.setItem('monoFrom', from);
  }, [from]);
  useEffect(() => {
    localStorage.setItem('monoTo', to);
  }, [to]);

  const token = import.meta.env.VITE_MONOBANK_TOKEN as string | undefined;

  const groupedByMcc = useMemo(() => {
    const groups: Record<string, { amount: number; items: MonoTxn[] }> = {};
    for (const t of txns) {
      const key = String(t.mcc || 'unknown');
      const entry = groups[key] || { amount: 0, items: [] };
      entry.amount += t.amount; // negative for expenses
      entry.items.push(t);
      groups[key] = entry;
    }
    return groups;
  }, [txns]);

  const totalExpense = useMemo(() => {
    return txns.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  }, [txns]);

  const fetchTxns = async () => {
    if (!token) {
      setError('Missing VITE_MONOBANK_TOKEN');
      return;
    }
    const acct = account && account.trim().length > 0 ? account.trim() : '0';
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.monobank.ua/personal/statement/${encodeURIComponent(acct)}/${toUnix(from)}/${toUnix(to)}`;
      const res = await fetch(url, {
        headers: { 'X-Token': token },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = (await res.json()) as MonoTxn[];
      setTxns(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-3">
            Source: <a className="underline" href="https://mcc.in.ua/ua/mccs" target="_blank" rel="noreferrer">mcc.in.ua</a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Account</Label>
              <Input value={account} onChange={e => setAccount(e.target.value)} placeholder="XXXXXXXX" />
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchTxns} disabled={loading}>{loading ? 'Loading...' : 'Fetch'}</Button>
            </div>
          </div>

          {error && <div className="text-destructive mb-4">{error}</div>}

          <div className="mb-4">
            <span className="text-muted-foreground">Total expenses:</span>{' '}
            <span className="font-medium">
              {currencySymbolFromCode(980)}{Math.abs(totalExpense / 100).toLocaleString()}
            </span>
          </div>

          <div className="space-y-4">
            {Object.entries(groupedByMcc).map(([mcc, info]) => (
              <div key={mcc} className="border rounded-lg p-4">
                <div className="flex justify-between">
                  <div>
                    <a className="underline" href={mccUrl(Number(mcc))} target="_blank" rel="noreferrer">{mccName(Number(mcc), mccCatalog)}</a>
                  </div>
                  <div className="font-medium">{currencySymbolFromCode(980)}{Math.abs(info.amount / 100).toLocaleString()}</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{info.items.length} transactions</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



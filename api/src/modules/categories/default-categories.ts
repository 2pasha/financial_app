export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  budget: number;
  mccCodes: number[];
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Продукти',
    icon: '🛒',
    color: '#22c55e',
    budget: 0,
    mccCodes: [5411, 5412, 5422, 5441, 5451, 5462, 5499, 5921],
  },
  {
    name: 'Ресторани',
    icon: '🍽️',
    color: '#f97316',
    budget: 0,
    mccCodes: [5812, 5814],
  },
  {
    name: "Кав'ярні",
    icon: '☕',
    color: '#eab308',
    budget: 0,
    mccCodes: [5813],
  },
  {
    name: 'Благодійність',
    icon: '❤️',
    color: '#f43f5e',
    budget: 0,
    mccCodes: [8398, 8641, 8661, 8699],
  },
  {
    name: 'Транзакції',
    icon: '💳',
    color: '#6366f1',
    budget: 0,
    mccCodes: [4829, 6010, 6011, 6012, 6051, 6540],
  },
  {
    name: 'Логістика',
    icon: '📦',
    color: '#06b6d4',
    budget: 0,
    mccCodes: [4111, 4112, 4121, 4131, 4214, 4215, 4225, 4411, 4511, 7513, 7523],
  },
  {
    name: 'Спорт',
    icon: '⚽',
    color: '#10b981',
    budget: 0,
    mccCodes: [5655, 5940, 5941, 7298, 7941, 7992, 7997],
  },
  {
    name: 'Гардероб',
    icon: '👕',
    color: '#8b5cf6',
    budget: 0,
    mccCodes: [5611, 5621, 5631, 5641, 5651, 5661, 5681, 5691, 5699],
  },
  {
    name: 'Розваги',
    icon: '🎬',
    color: '#ec4899',
    budget: 0,
    mccCodes: [5815, 5816, 5817, 5818, 7832, 7922, 7929, 7933, 7994, 7996, 7999],
  },
  {
    name: 'Відкладення',
    icon: '💰',
    color: '#14b8a6',
    budget: 0,
    mccCodes: [6211, 6300, 6399],
  },
  {
    name: 'Інше',
    icon: '🔖',
    color: '#94a3b8',
    budget: 0,
    mccCodes: [],
  },
];

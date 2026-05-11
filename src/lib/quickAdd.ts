import { PAYMENT_METHODS } from '../domain/constants';
import type { ExpenseCategory, IncomeCategory, PaymentMethod } from '../domain/models';

export type QuickAddIntent = 'expense' | 'income' | 'transfer';

export interface QuickAddParseResult {
  raw: string;
  intent: QuickAddIntent;
  amount?: number;
  note: string;
  paymentMethod?: PaymentMethod;
  category?: ExpenseCategory | IncomeCategory;
  fromMethod?: PaymentMethod;
  toMethod?: PaymentMethod;
  confidence: 'high' | 'medium' | 'low';
}

const paymentAliases: Record<string, PaymentMethod> = {
  cash: 'Cash',
  bkash: 'bKash',
  'b-kash': 'bKash',
  nagad: 'Nagad',
  card: 'Card',
  debit: 'Card',
  credit: 'Card',
  visa: 'Card',
  mastercard: 'Card',
  bank: 'Bank',
  transfer: 'Bank',
  other: 'Other',
};

const incomeKeywords = new Set(['salary', 'income', 'paid', 'received', 'bonus', 'refund', 'cashback', 'reimburse']);
const transferKeywords = new Set(['transfer', 'move', 'send', 'sent', 'top-up', 'topup', 'cashout']);

// Map of single keyword → most likely expense category. Use lowercase exact word matches.
const expenseCategoryHints: Record<string, ExpenseCategory> = {
  lunch: 'Food',
  dinner: 'Food',
  breakfast: 'Food',
  food: 'Food',
  meal: 'Food',
  snack: 'Snacks',
  snacks: 'Snacks',
  tea: 'Food',
  coffee: 'Food',
  kfc: 'Food',
  pizza: 'Food',
  restaurant: 'Food',
  groceries: 'Food',
  grocery: 'Food',
  uber: 'Transportation',
  pathao: 'Transportation',
  cab: 'Transportation',
  taxi: 'Transportation',
  bus: 'Transportation',
  train: 'Transportation',
  cng: 'Transportation',
  rickshaw: 'Transportation',
  fuel: 'Car',
  petrol: 'Car',
  gas: 'Car',
  parking: 'Car',
  rent: 'Housing',
  mortgage: 'Housing',
  electricity: 'Bills',
  electric: 'Bills',
  bill: 'Bills',
  bills: 'Bills',
  internet: 'Bills',
  wifi: 'Bills',
  water: 'Bills',
  netflix: 'Entertainment',
  movie: 'Entertainment',
  movies: 'Entertainment',
  cinema: 'Entertainment',
  game: 'Entertainment',
  games: 'Entertainment',
  spotify: 'Entertainment',
  recharge: 'Recharge',
  airtime: 'Recharge',
  doctor: 'Health',
  hospital: 'Health',
  clinic: 'Health',
  medicine: 'Medicine',
  pharmacy: 'Medicine',
  drugs: 'Medicine',
  vegetable: 'Vegetables',
  vegetables: 'Vegetables',
  fruit: 'Fruits',
  fruits: 'Fruits',
  apple: 'Fruits',
  banana: 'Fruits',
  shirt: 'Clothing',
  pants: 'Clothing',
  dress: 'Clothing',
  shoes: 'Clothing',
  clothes: 'Clothing',
  gym: 'Sports',
  fitness: 'Sports',
  sport: 'Sports',
  sports: 'Sports',
  gift: 'Gifts',
  gifts: 'Gifts',
  donate: 'Donations',
  donation: 'Donations',
  charity: 'Donations',
  alcohol: 'Alcohol',
  beer: 'Alcohol',
  wine: 'Alcohol',
  cigarette: 'Cigarettes',
  smoke: 'Cigarettes',
  cigarettes: 'Cigarettes',
  pet: 'Pets',
  dog: 'Pets',
  cat: 'Pets',
  vet: 'Pets',
  travel: 'Travel',
  flight: 'Travel',
  hotel: 'Travel',
  trip: 'Travel',
  school: 'Education',
  tuition: 'Education',
  book: 'Education',
  books: 'Education',
  course: 'Education',
  haircut: 'Beauty',
  salon: 'Beauty',
  spa: 'Beauty',
  party: 'Social',
  social: 'Social',
  birthday: 'Social',
  phone: 'Phone',
  mobile: 'Phone',
  laptop: 'Electronics',
  computer: 'Electronics',
  headphones: 'Electronics',
  charger: 'Electronics',
  repair: 'Repairs',
  fix: 'Repairs',
  plumber: 'Repairs',
  furniture: 'Home',
  sofa: 'Home',
  baby: 'Kids',
  toy: 'Kids',
  toys: 'Kids',
  child: 'Kids',
  kids: 'Kids',
  shopping: 'Shopping',
};

const incomeCategoryHints: Record<string, IncomeCategory> = {
  salary: 'Salary',
  paycheck: 'Salary',
  wage: 'Salary',
  freelance: 'Part-Time',
  freelancing: 'Part-Time',
  parttime: 'Part-Time',
  'part-time': 'Part-Time',
  consulting: 'Part-Time',
  bonus: 'Bonus',
  investment: 'Investments',
  investments: 'Investments',
  dividend: 'Investments',
  interest: 'Investments',
  stock: 'Investments',
  gift: 'Gift',
  refund: 'Refund',
  cashback: 'Refund',
  reimbursement: 'Refund',
};

const TRANSFER_ARROW = /\b(?:to|→|->)\b/;

export function parseQuickEntry(input: string): QuickAddParseResult {
  const raw = input.trim();
  const lower = raw.toLowerCase();

  // Detect intent first
  let intent: QuickAddIntent = 'expense';
  if (transferKeywords.has(lower.split(/\s+/)[0]) || (TRANSFER_ARROW.test(lower) && PAYMENT_METHODS.some((m) => lower.includes(m.toLowerCase())))) {
    intent = 'transfer';
  } else if ([...incomeKeywords].some((keyword) => lower.includes(keyword))) {
    intent = 'income';
  }

  // Pull the first numeric token as the amount.
  const amountMatch = lower.match(/(?<![a-z])(\d+(?:[.,]\d+)?)(?![a-z])/);
  const amount = amountMatch ? Number(amountMatch[1].replace(',', '.')) : undefined;

  // Token-based scan for payment methods + categories.
  const tokens = lower
    .replace(/[.,]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let paymentMethod: PaymentMethod | undefined;
  const matchedPayments: PaymentMethod[] = [];
  for (const token of tokens) {
    const direct = paymentAliases[token];
    if (direct) {
      matchedPayments.push(direct);
      if (!paymentMethod) paymentMethod = direct;
    }
  }

  let category: ExpenseCategory | IncomeCategory | undefined;
  if (intent === 'income') {
    for (const token of tokens) {
      const hit = incomeCategoryHints[token];
      if (hit) {
        category = hit;
        break;
      }
    }
    if (!category) category = 'Others';
  } else if (intent === 'expense') {
    for (const token of tokens) {
      const hit = expenseCategoryHints[token];
      if (hit) {
        category = hit;
        break;
      }
    }
    if (!category) category = 'Other';
  }

  // Build the note: strip the amount, payment-method aliases, and intent verbs.
  const stripWords = new Set<string>();
  for (const alias of Object.keys(paymentAliases)) stripWords.add(alias);
  for (const verb of transferKeywords) stripWords.add(verb);
  for (const verb of incomeKeywords) stripWords.add(verb);

  const noteTokens = tokens.filter((token) => {
    if (amountMatch && token === amountMatch[1]) return false;
    if (stripWords.has(token)) return false;
    return true;
  });
  const note = noteTokens.join(' ').replace(/\b(on|with|for|to|from|by)\b/g, '').replace(/\s+/g, ' ').trim();

  // Transfer-specific extraction: pick the first two distinct payment methods as from/to.
  let fromMethod: PaymentMethod | undefined;
  let toMethod: PaymentMethod | undefined;
  if (intent === 'transfer') {
    [fromMethod, toMethod] = matchedPayments.slice(0, 2);
    if (!toMethod && fromMethod) {
      toMethod = fromMethod === 'Cash' ? 'Bank' : 'Cash';
    }
  }

  // Confidence heuristic.
  let confidence: QuickAddParseResult['confidence'] = 'low';
  if (amount && (paymentMethod || intent === 'transfer') && category) confidence = 'high';
  else if (amount) confidence = 'medium';

  return {
    raw,
    intent,
    amount,
    note: note || (category ?? ''),
    paymentMethod,
    category,
    fromMethod,
    toMethod,
    confidence,
  };
}

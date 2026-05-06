import type { CurrencyCode, ExpenseCategory, IncomeCategory, PaymentMethod, SubscriptionCycle } from './models.js';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Shopping',
  'Food',
  'Phone',
  'Entertainment',
  'Education',
  'Beauty',
  'Sports',
  'Social',
  'Transportation',
  'Clothing',
  'Car',
  'Alcohol',
  'Cigarettes',
  'Electronics',
  'Travel',
  'Health',
  'Pets',
  'Repairs',
  'Housing',
  'Home',
  'Gifts',
  'Donations',
  'Lottery',
  'Snacks',
  'Kids',
  'Vegetables',
  'Fruits',
  'Bills',
  'Medicine',
  'Recharge',
  'Other',
];

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salary',
  'Investments',
  'Part-Time',
  'Bonus',
  'Gift',
  'Refund',
  'Others',
];

export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'bKash', 'Nagad', 'Card', 'Bank', 'Other'];

export const SUBSCRIPTION_CYCLES: SubscriptionCycle[] = ['weekly', 'monthly', 'yearly'];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  BDT: '৳',
  USD: '$',
  EUR: '€',
  INR: '₹',
  GBP: '£',
};

export const CURRENCIES: CurrencyCode[] = ['BDT', 'USD', 'EUR', 'INR', 'GBP'];

export const APP_VERSION = '0.2.0';

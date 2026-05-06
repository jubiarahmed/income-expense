import type { CurrencyCode, ExpenseCategory, PaymentMethod, SubscriptionCycle } from './models.js';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Medicine',
  'Recharge',
  'Entertainment',
  'Other',
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

export const APP_VERSION = '0.1.0';

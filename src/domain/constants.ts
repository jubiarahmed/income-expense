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

// Single source of truth for currencies. Ordered with the South-Asia + reserve
// currencies first (most common for this app's users), then the rest of the
// world alphabetically by code.
export const CURRENCY_DETAILS: ReadonlyArray<{ code: string; name: string; symbol: string }> = [
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'BTN', name: 'Bhutanese Ngultrum', symbol: 'Nu.' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'L£' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'रू' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'UZS', name: 'Uzbekistani Som', symbol: "so'm" },
  { code: 'VES', name: 'Venezuelan Bolívar', symbol: 'Bs.' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'XAF', name: 'Central African Franc', symbol: 'FCFA' },
  { code: 'XOF', name: 'West African Franc', symbol: 'CFA' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
];

export const CURRENCIES: CurrencyCode[] = CURRENCY_DETAILS.map((c) => c.code);

export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  CURRENCY_DETAILS.map((c) => [c.code, c.symbol]),
);

// Common values for the "days before due" reminder threshold in Settings.
export const REMINDER_DAYS_OPTIONS = [0, 1, 2, 3, 5, 7, 14, 30] as const;

export const APP_VERSION = '0.2.0';

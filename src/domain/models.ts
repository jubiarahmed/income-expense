export type ID = string;

export const CURRENT_USER_ID = 'me';

export type CurrencyCode = 'BDT' | 'USD' | 'EUR' | 'INR' | 'GBP';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccountRole = 'user' | 'superadmin';
export type AccountStatus = 'active' | 'held';

// Categories are free-form strings — the predefined sets in `constants.ts` are
// suggestions/icons-with-colors; users can also enter custom names.
export type ExpenseCategory = string;
export type IncomeCategory = string;

export type PaymentMethod = 'Cash' | 'bKash' | 'Nagad' | 'Card' | 'Bank' | 'Other';
export type SplitType = 'equal' | 'custom';
export type LoanDirection = 'lent' | 'borrowed';
export type LoanStatus = 'active' | 'settled';
export type ItemDirection = 'lent' | 'borrowed';
export type ItemStatus = 'active' | 'returned';
export type SubscriptionCycle = 'weekly' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type ReminderSourceType = 'loan' | 'item' | 'subscription';
export type ReminderStatus = 'scheduled' | 'sent' | 'dismissed';
export type ActivityEntityType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'sharedExpense'
  | 'sharedGroup'
  | 'loan'
  | 'loanPayment'
  | 'item'
  | 'subscription'
  | 'contact'
  | 'settings';

export interface UserPreferences {
  id: ID;
  accountId: ID;
  currency: CurrencyCode;
  reminderDaysBefore: number;
  notificationsEnabled: boolean;
  theme: ThemeMode;
  seededAt?: string;
  updatedAt: string;
}

export interface Account {
  id: ID;
  name: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  passwordHash?: string;
  passwordSalt?: string;
  holdReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSettings {
  id: 'global';
  accountCreationEnabled: boolean;
  updatedAt: string;
  updatedBy?: ID;
}

export interface AuthSession {
  id: 'current';
  accountId: ID;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: ID;
  accountId: ID;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: ID;
  accountId: ID;
  amount: number;
  category: ExpenseCategory;
  note: string;
  date: string;
  paymentMethod: PaymentMethod;
  tags: string[];
  receiptImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: ID;
  accountId: ID;
  amount: number;
  category: IncomeCategory;
  source: string;
  note: string;
  date: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  id: ID;
  accountId: ID;
  amount: number;
  fromMethod: PaymentMethod;
  toMethod: PaymentMethod;
  fee: number;
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedParticipant {
  contactId: ID;
  displayName: string;
}

export interface SharedGroup {
  id: ID;
  accountId: ID;
  name: string;
  description: string;
  participantIds: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface SharedExpenseShare {
  contactId: ID;
  amount: number;
}

export interface SharedExpense {
  id: ID;
  accountId: ID;
  groupId: ID;
  amount: number;
  note: string;
  date: string;
  payerId: ID;
  participantIds: ID[];
  splitType: SplitType;
  shares: SharedExpenseShare[];
  settled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: ID;
  accountId: ID;
  personId: ID;
  direction: LoanDirection;
  amount: number;
  date: string;
  dueDate?: string;
  notes: string;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: ID;
  accountId: ID;
  loanId: ID;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface ItemRecord {
  id: ID;
  accountId: ID;
  itemName: string;
  personId: ID;
  direction: ItemDirection;
  date: string;
  dueDate?: string;
  note: string;
  status: ItemStatus;
  returnedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: ID;
  accountId: ID;
  name: string;
  amount: number;
  cycle: SubscriptionCycle;
  category: string;
  nextDueDate: string;
  autoRenew: boolean;
  notes: string;
  status: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: ID;
  accountId: ID;
  sourceType: ReminderSourceType;
  sourceId: ID;
  title: string;
  dueAt: string;
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: ID;
  accountId: ID;
  entityType: ActivityEntityType;
  entityId: ID;
  personId?: ID;
  title: string;
  detail: string;
  amount?: number;
  createdAt: string;
}

export interface AppDataSnapshot {
  preferences: UserPreferences;
  contacts: Contact[];
  expenses: Expense[];
  incomes: Income[];
  transfers: Transfer[];
  sharedGroups: SharedGroup[];
  sharedExpenses: SharedExpense[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  items: ItemRecord[];
  subscriptions: Subscription[];
  reminders: Reminder[];
  activities: ActivityLog[];
}

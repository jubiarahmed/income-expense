export type ID = string;

export const CURRENT_USER_ID = 'me';

// ISO 4217 currency code. The full list lives in `constants.ts` (CURRENCY_DETAILS)
// and is validated at the zod boundary — keep this widened to `string` so adding
// a new entry to that array doesn't ripple through every consumer.
export type CurrencyCode = string;
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
  | 'budget'
  | 'wallet'
  | 'goal'
  | 'goalContribution'
  | 'settings';

export type GoalStatus = 'active' | 'completed' | 'archived';

export interface NotificationPrefs {
  remindBeforeDays: number[];
  remindOnDueDate: boolean;
  remindAfterOverdue: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
  budgetWarning: boolean;
  subscriptionRenewal: boolean;
}

export interface UserPreferences {
  id: ID;
  accountId: ID;
  currency: CurrencyCode;
  reminderDaysBefore: number;
  notificationsEnabled: boolean;
  theme: ThemeMode;
  notificationPrefs?: NotificationPrefs;
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
  merchant?: string;
  date: string;
  paymentMethod: PaymentMethod;
  tags: string[];
  receiptImage?: string;
  createdAt: string;
  updatedAt: string;
}

export type SavedFilterScope = 'all' | 'expense' | 'income' | 'transfer' | 'shared';

export interface SavedFilterQuery {
  q?: string;
  type?: SavedFilterScope;
  categories?: string[];
  paymentMethods?: PaymentMethod[];
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  tag?: string;
  merchant?: string;
  hasReceipt?: boolean;
}

export interface SavedFilter {
  id: ID;
  accountId: ID;
  name: string;
  scope: SavedFilterScope;
  query: SavedFilterQuery;
  createdAt: string;
  updatedAt: string;
}

export type TransactionTemplateKind = 'expense' | 'income' | 'transfer';

export interface TransactionTemplateData {
  amount?: number;
  category?: string;
  note?: string;
  merchant?: string;
  source?: string;
  paymentMethod?: PaymentMethod;
  fromMethod?: PaymentMethod;
  toMethod?: PaymentMethod;
  tags?: string;
  fee?: number;
}

export interface TransactionTemplate {
  id: ID;
  accountId: ID;
  name: string;
  kind: TransactionTemplateKind;
  data: TransactionTemplateData;
  usesCount: number;
  lastUsedAt?: string;
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

export type LoanInterestType = 'none' | 'flat' | 'apr';

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
  interestRate: number;
  interestType: LoanInterestType;
  installmentsCount?: number;
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

export interface Budget {
  id: ID;
  accountId: ID;
  category: string;
  monthlyLimit: number;
  notifyAt: number;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: ID;
  accountId: ID;
  method: PaymentMethod;
  name: string;
  openingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: ID;
  accountId: ID;
  name: string;
  targetAmount: number;
  savedAmount: number;
  walletMethod?: PaymentMethod;
  deadline?: string;
  notes: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GoalContribution {
  id: ID;
  accountId: ID;
  goalId: ID;
  amount: number;
  date: string;
  note: string;
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
  budgets: Budget[];
  wallets: Wallet[];
  goals: Goal[];
  goalContributions: GoalContribution[];
  savedFilters: SavedFilter[];
  templates: TransactionTemplate[];
}

import { z } from 'zod';
import { PAYMENT_METHODS, SUBSCRIPTION_CYCLES } from './constants.js';

const idSchema = z.string().min(1);
const moneySchema = z.coerce.number().positive('Enter an amount greater than 0');
const dateSchema = z.string().min(1, 'Choose a date');
const optionalDateSchema = z.string().optional();
const categorySchema = z.string().trim().min(1, 'Category is required').max(40, 'Category is too long');

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const expenseSchema = z.object({
  amount: moneySchema,
  category: categorySchema,
  note: z.string().trim().optional().default(''),
  merchant: z.string().trim().max(40).optional(),
  date: dateSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  tags: z.string().optional().default(''),
  receiptImage: z.string().optional(),
});

export const incomeSchema = z.object({
  amount: moneySchema,
  category: categorySchema,
  source: z.string().trim().optional().default(''),
  note: z.string().trim().optional().default(''),
  date: dateSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
});

export const transferSchema = z
  .object({
    amount: moneySchema,
    fromMethod: z.enum(PAYMENT_METHODS),
    toMethod: z.enum(PAYMENT_METHODS),
    fee: z.coerce.number().min(0).optional().default(0),
    date: dateSchema,
    note: z.string().trim().optional().default(''),
  })
  .refine((input) => input.fromMethod !== input.toMethod, {
    message: 'From and To accounts must be different',
    path: ['toMethod'],
  });

export const sharedGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required'),
  description: z.string().trim().optional().default(''),
  participantIds: z.array(idSchema).min(1, 'Add at least one person'),
});

export const sharedExpenseSchema = z.object({
  groupId: idSchema,
  amount: moneySchema,
  note: z.string().trim().min(1, 'Note is required'),
  date: dateSchema,
  payerId: idSchema,
  participantIds: z.array(idSchema).min(1, 'Choose participants'),
  splitType: z.enum(['equal', 'custom']),
  customShares: z.record(idSchema, z.coerce.number().min(0)).optional().default({}),
  settled: z.boolean().optional().default(false),
});

export const loanSchema = z.object({
  personId: idSchema,
  direction: z.enum(['lent', 'borrowed']),
  amount: moneySchema,
  date: dateSchema,
  dueDate: optionalDateSchema,
  notes: z.string().trim().optional().default(''),
  status: z.enum(['active', 'settled']).optional().default('active'),
});

export const loanPaymentSchema = z.object({
  loanId: idSchema,
  amount: moneySchema,
  date: dateSchema,
  note: z.string().trim().optional().default(''),
});

export const itemSchema = z.object({
  itemName: z.string().trim().min(1, 'Item name is required'),
  personId: idSchema,
  direction: z.enum(['lent', 'borrowed']),
  date: dateSchema,
  dueDate: optionalDateSchema,
  note: z.string().trim().optional().default(''),
  status: z.enum(['active', 'returned']).optional().default('active'),
  returnedDate: optionalDateSchema,
});

export const subscriptionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  amount: moneySchema,
  cycle: z.enum(SUBSCRIPTION_CYCLES),
  category: z.string().trim().min(1, 'Category is required'),
  nextDueDate: dateSchema,
  autoRenew: z.boolean().optional().default(true),
  notes: z.string().trim().optional().default(''),
  status: z.enum(['active', 'paused', 'cancelled']).optional().default('active'),
});

export const notificationPrefsSchema = z.object({
  remindBeforeDays: z.array(z.coerce.number().int().min(0).max(30)).optional().default([1, 3]),
  remindOnDueDate: z.boolean().optional().default(true),
  remindAfterOverdue: z.boolean().optional().default(true),
  dailySummary: z.boolean().optional().default(false),
  weeklySummary: z.boolean().optional().default(true),
  budgetWarning: z.boolean().optional().default(true),
  subscriptionRenewal: z.boolean().optional().default(true),
});

export const preferencesSchema = z.object({
  currency: z.enum(['BDT', 'USD', 'EUR', 'INR', 'GBP']),
  reminderDaysBefore: z.coerce.number().int().min(0).max(30),
  notificationsEnabled: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  notificationPrefs: notificationPrefsSchema.optional(),
});

export const savedFilterScopeSchema = z.enum(['all', 'expense', 'income', 'transfer', 'shared']);

export const savedFilterQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  type: savedFilterScopeSchema.optional(),
  categories: z.array(z.string().trim().max(40)).optional(),
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tag: z.string().trim().max(40).optional(),
  merchant: z.string().trim().max(40).optional(),
  hasReceipt: z.boolean().optional(),
});

export const savedFilterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  scope: savedFilterScopeSchema,
  query: savedFilterQuerySchema,
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const budgetSchema = z.object({
  category: categorySchema,
  monthlyLimit: moneySchema,
  notifyAt: z.coerce.number().int().min(50).max(100).optional().default(80),
});

export const walletSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  name: z.string().trim().min(1, 'Name is required').max(40),
  openingBalance: z.coerce.number().optional().default(0),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Goal name is required').max(60),
  targetAmount: moneySchema,
  savedAmount: z.coerce.number().min(0).optional().default(0),
  walletMethod: z.enum(PAYMENT_METHODS).optional(),
  deadline: optionalDateSchema,
  notes: z.string().trim().optional().default(''),
  status: z.enum(['active', 'completed', 'archived']).optional().default('active'),
});

export const goalContributionSchema = z.object({
  goalId: idSchema,
  amount: moneySchema,
  date: dateSchema,
  note: z.string().trim().optional().default(''),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type IncomeInput = z.infer<typeof incomeSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type SharedGroupInput = z.infer<typeof sharedGroupSchema>;
export type SharedExpenseInput = z.infer<typeof sharedExpenseSchema>;
export type LoanInput = z.infer<typeof loanSchema>;
export type LoanPaymentInput = z.infer<typeof loanPaymentSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export const tagRenameSchema = z.object({
  from: z.string().trim().min(1).max(40),
  to: z.string().trim().min(1).max(40),
});

export const templateDataSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  category: z.string().trim().max(40).optional(),
  note: z.string().trim().max(240).optional(),
  merchant: z.string().trim().max(40).optional(),
  source: z.string().trim().max(60).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  fromMethod: z.enum(PAYMENT_METHODS).optional(),
  toMethod: z.enum(PAYMENT_METHODS).optional(),
  tags: z.string().trim().max(120).optional(),
  fee: z.coerce.number().min(0).optional(),
});

export const templateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  kind: z.enum(['expense', 'income', 'transfer']),
  data: templateDataSchema,
});

export const bulkExpenseUpdateSchema = z.object({
  ids: z.array(idSchema).min(1).max(200),
  patch: z.object({
    category: categorySchema.optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    addTag: z.string().trim().min(1).max(40).optional(),
    removeTag: z.string().trim().min(1).max(40).optional(),
  }),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(idSchema).min(1).max(200),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;
export type SavedFilterInput = z.infer<typeof savedFilterSchema>;
export type SavedFilterQueryInput = z.infer<typeof savedFilterQuerySchema>;
export type TagRenameInput = z.infer<typeof tagRenameSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
export type TemplateDataInput = z.infer<typeof templateDataSchema>;
export type BulkExpenseUpdateInput = z.infer<typeof bulkExpenseUpdateSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
export type WalletInput = z.infer<typeof walletSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type GoalContributionInput = z.infer<typeof goalContributionSchema>;

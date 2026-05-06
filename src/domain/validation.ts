import { z } from 'zod';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, SUBSCRIPTION_CYCLES } from './constants.js';

const idSchema = z.string().min(1);
const moneySchema = z.coerce.number().positive('Enter an amount greater than 0');
const dateSchema = z.string().min(1, 'Choose a date');
const optionalDateSchema = z.string().optional();

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const expenseSchema = z.object({
  amount: moneySchema,
  category: z.enum(EXPENSE_CATEGORIES),
  note: z.string().trim().optional().default(''),
  date: dateSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  tags: z.string().optional().default(''),
  receiptImage: z.string().optional(),
});

export const incomeSchema = z.object({
  amount: moneySchema,
  category: z.enum(INCOME_CATEGORIES),
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

export const preferencesSchema = z.object({
  currency: z.enum(['BDT', 'USD', 'EUR', 'INR', 'GBP']),
  reminderDaysBefore: z.coerce.number().int().min(0).max(30),
  notificationsEnabled: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
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

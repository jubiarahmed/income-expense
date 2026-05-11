import { create } from 'zustand';
import type {
  AppDataSnapshot,
  Contact,
  ID,
  SharedGroup,
  UserPreferences,
} from '../domain/models';
import type {
  BudgetInput,
  ContactInput,
  ExpenseInput,
  GoalContributionInput,
  GoalInput,
  IncomeInput,
  ItemInput,
  LoanInput,
  LoanPaymentInput,
  PreferencesInput,
  SharedExpenseInput,
  SharedGroupInput,
  SubscriptionInput,
  TransferInput,
  WalletInput,
} from '../domain/validation';
import { apiFetch, postApi } from '../lib/api';

const defaultPreferences: UserPreferences = {
  id: 'preferences_pending',
  accountId: 'pending',
  currency: 'BDT',
  reminderDaysBefore: 2,
  notificationsEnabled: false,
  theme: 'light',
  updatedAt: new Date().toISOString(),
};

function emptySnapshot(): AppDataSnapshot {
  return {
    preferences: defaultPreferences,
    contacts: [],
    expenses: [],
    incomes: [],
    transfers: [],
    sharedGroups: [],
    sharedExpenses: [],
    loans: [],
    loanPayments: [],
    items: [],
    subscriptions: [],
    reminders: [],
    activities: [],
    budgets: [],
    wallets: [],
    goals: [],
    goalContributions: [],
  };
}

let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null;

export function applyTheme(theme: UserPreferences['theme']) {
  if (typeof window === 'undefined') return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (systemThemeListener) {
    mq.removeEventListener('change', systemThemeListener);
    systemThemeListener = null;
  }
  if (theme === 'system') {
    const apply = () => document.documentElement.classList.toggle('dark', mq.matches);
    systemThemeListener = apply;
    mq.addEventListener('change', apply);
    apply();
    return;
  }
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

interface FinanceState extends AppDataSnapshot {
  accountId?: ID;
  initialized: boolean;
  loading: boolean;
  error?: string;
  init: (accountId: ID) => Promise<void>;
  reload: () => Promise<void>;
  clearSession: () => void;
  addContact: (input: ContactInput) => Promise<Contact>;
  updateContact: (id: ID, input: ContactInput) => Promise<void>;
  deleteContact: (id: ID) => Promise<void>;
  addExpense: (input: ExpenseInput) => Promise<void>;
  updateExpense: (id: ID, input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: ID) => Promise<void>;
  duplicateExpense: (id: ID) => Promise<void>;
  addIncome: (input: IncomeInput) => Promise<void>;
  updateIncome: (id: ID, input: IncomeInput) => Promise<void>;
  deleteIncome: (id: ID) => Promise<void>;
  addTransfer: (input: TransferInput) => Promise<void>;
  updateTransfer: (id: ID, input: TransferInput) => Promise<void>;
  deleteTransfer: (id: ID) => Promise<void>;
  addSharedGroup: (input: SharedGroupInput) => Promise<SharedGroup>;
  updateSharedGroup: (id: ID, input: SharedGroupInput) => Promise<void>;
  deleteSharedGroup: (id: ID) => Promise<void>;
  addSharedExpense: (input: SharedExpenseInput) => Promise<void>;
  updateSharedExpense: (id: ID, input: SharedExpenseInput) => Promise<void>;
  deleteSharedExpense: (id: ID) => Promise<void>;
  toggleSharedExpenseSettled: (id: ID) => Promise<void>;
  addLoan: (input: LoanInput) => Promise<void>;
  updateLoan: (id: ID, input: LoanInput) => Promise<void>;
  deleteLoan: (id: ID) => Promise<void>;
  addLoanPayment: (input: LoanPaymentInput) => Promise<void>;
  deleteLoanPayment: (id: ID) => Promise<void>;
  addItem: (input: ItemInput) => Promise<void>;
  updateItem: (id: ID, input: ItemInput) => Promise<void>;
  deleteItem: (id: ID) => Promise<void>;
  markItemReturned: (id: ID) => Promise<void>;
  addSubscription: (input: SubscriptionInput) => Promise<void>;
  updateSubscription: (id: ID, input: SubscriptionInput) => Promise<void>;
  deleteSubscription: (id: ID) => Promise<void>;
  updatePreferences: (input: PreferencesInput) => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
  dismissReminder: (id: ID) => Promise<void>;
  exportData: () => Promise<AppDataSnapshot>;
  addBudget: (input: BudgetInput) => Promise<void>;
  updateBudget: (id: ID, input: BudgetInput) => Promise<void>;
  deleteBudget: (id: ID) => Promise<void>;
  upsertWallet: (input: WalletInput) => Promise<void>;
  deleteWallet: (id: ID) => Promise<void>;
  addGoal: (input: GoalInput) => Promise<void>;
  updateGoal: (id: ID, input: GoalInput) => Promise<void>;
  deleteGoal: (id: ID) => Promise<void>;
  contributeToGoal: (input: GoalContributionInput) => Promise<void>;
  deleteGoalContribution: (id: ID) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => {
  async function loadSnapshot(accountId?: ID) {
    const snapshot = await apiFetch<AppDataSnapshot>('/api/app?action=snapshot');
    applyTheme(snapshot.preferences.theme);
    set({ ...snapshot, accountId: accountId ?? snapshot.preferences.accountId, initialized: true, loading: false, error: undefined });
    return snapshot;
  }

  async function run(action: string, payload?: unknown) {
    await postApi('/api/app', { action, payload });
    await get().reload();
  }

  return {
    ...emptySnapshot(),
    accountId: undefined,
    initialized: false,
    loading: false,
    error: undefined,

    init: async (accountId) => {
      set({ ...emptySnapshot(), accountId, initialized: false, loading: true, error: undefined });
      try {
        await loadSnapshot(accountId);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Unable to load Expense Tracker data', loading: false });
      }
    },

    reload: async () => {
      await loadSnapshot(get().accountId);
    },

    clearSession: () => {
      applyTheme('light');
      set({ ...emptySnapshot(), accountId: undefined, initialized: false, loading: false, error: undefined });
    },

    addContact: async (input) => {
      await run('addContact', input);
      return get().contacts[0];
    },
    updateContact: async (id, input) => run('updateContact', { id, input }),
    deleteContact: async (id) => run('deleteContact', { id }),
    addExpense: async (input) => run('addExpense', input),
    updateExpense: async (id, input) => run('updateExpense', { id, input }),
    deleteExpense: async (id) => run('deleteExpense', { id }),
    duplicateExpense: async (id) => run('duplicateExpense', { id }),
    addIncome: async (input) => run('addIncome', input),
    updateIncome: async (id, input) => run('updateIncome', { id, input }),
    deleteIncome: async (id) => run('deleteIncome', { id }),
    addTransfer: async (input) => run('addTransfer', input),
    updateTransfer: async (id, input) => run('updateTransfer', { id, input }),
    deleteTransfer: async (id) => run('deleteTransfer', { id }),
    addSharedGroup: async (input) => {
      await run('addSharedGroup', input);
      return get().sharedGroups[0];
    },
    updateSharedGroup: async (id, input) => run('updateSharedGroup', { id, input }),
    deleteSharedGroup: async (id) => run('deleteSharedGroup', { id }),
    addSharedExpense: async (input) => run('addSharedExpense', input),
    updateSharedExpense: async (id, input) => run('updateSharedExpense', { id, input }),
    deleteSharedExpense: async (id) => run('deleteSharedExpense', { id }),
    toggleSharedExpenseSettled: async (id) => run('toggleSharedExpenseSettled', { id }),
    addLoan: async (input) => run('addLoan', input),
    updateLoan: async (id, input) => run('updateLoan', { id, input }),
    deleteLoan: async (id) => run('deleteLoan', { id }),
    addLoanPayment: async (input) => run('addLoanPayment', input),
    deleteLoanPayment: async (id) => run('deleteLoanPayment', { id }),
    addItem: async (input) => run('addItem', input),
    updateItem: async (id, input) => run('updateItem', { id, input }),
    deleteItem: async (id) => run('deleteItem', { id }),
    markItemReturned: async (id) => run('markItemReturned', { id }),
    addSubscription: async (input) => run('addSubscription', input),
    updateSubscription: async (id, input) => run('updateSubscription', { id, input }),
    deleteSubscription: async (id) => run('deleteSubscription', { id }),
    updatePreferences: async (input) => run('updatePreferences', input),

    requestNotificationPermission: async () => {
      if (!('Notification' in window)) throw new Error('Notifications are not supported in this browser.');
      const permission = await Notification.requestPermission();
      await get().updatePreferences({ ...get().preferences, notificationsEnabled: permission === 'granted' });
    },

    dismissReminder: async (id) => run('dismissReminder', { id }),
    exportData: async () => apiFetch<AppDataSnapshot>('/api/app?action=snapshot'),

    addBudget: async (input) => run('addBudget', input),
    updateBudget: async (id, input) => run('updateBudget', { id, input }),
    deleteBudget: async (id) => run('deleteBudget', { id }),
    upsertWallet: async (input) => run('upsertWallet', input),
    deleteWallet: async (id) => run('deleteWallet', { id }),
    addGoal: async (input) => run('addGoal', input),
    updateGoal: async (id, input) => run('updateGoal', { id, input }),
    deleteGoal: async (id) => run('deleteGoal', { id }),
    contributeToGoal: async (input) => run('contributeToGoal', input),
    deleteGoalContribution: async (id) => run('deleteGoalContribution', { id }),
  };
});

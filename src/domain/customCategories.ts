import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './constants';
import type { Expense, Income } from './models';

function mergeUnique(predefined: string[], extras: string[]): string[] {
  const set = new Set(predefined);
  const customs: string[] = [];
  for (const name of extras) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    if (!set.has(trimmed)) {
      set.add(trimmed);
      customs.push(trimmed);
    }
  }
  return [...predefined, ...customs];
}

export function getAllExpenseCategories(expenses: Expense[]): string[] {
  return mergeUnique(EXPENSE_CATEGORIES, expenses.map((expense) => expense.category));
}

export function getAllIncomeCategories(incomes: Income[]): string[] {
  return mergeUnique(INCOME_CATEGORIES, incomes.map((income) => income.category));
}

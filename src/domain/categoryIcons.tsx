import {
  Apple,
  Banknote,
  Beef,
  Bike,
  Briefcase,
  Bus,
  Cake,
  Car,
  Carrot,
  Cherry,
  Cigarette,
  Coffee,
  Coins,
  Cookie,
  CreditCard,
  Dices,
  Dog,
  Dumbbell,
  Film,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HandHeart,
  Heart,
  HousePlus,
  type LucideIcon,
  Package,
  Phone,
  Pill,
  Plane,
  Receipt,
  RotateCcw,
  Scissors,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sofa,
  Sparkles,
  Stethoscope,
  Tag,
  TrendingUp,
  Trophy,
  Users,
  Wine,
  Wrench,
  Zap,
} from 'lucide-react';
import type { ExpenseCategory, IncomeCategory } from './models';

const fallbackPalettes: { bg: string; fg: string }[] = [
  { bg: 'bg-indigo-100 dark:bg-indigo-950', fg: 'text-indigo-600 dark:text-indigo-300' },
  { bg: 'bg-violet-100 dark:bg-violet-950', fg: 'text-violet-600 dark:text-violet-300' },
  { bg: 'bg-cyan-100 dark:bg-cyan-950', fg: 'text-cyan-600 dark:text-cyan-300' },
  { bg: 'bg-teal-100 dark:bg-teal-950', fg: 'text-teal-600 dark:text-teal-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-950', fg: 'text-emerald-600 dark:text-emerald-300' },
  { bg: 'bg-amber-100 dark:bg-amber-950', fg: 'text-amber-600 dark:text-amber-300' },
  { bg: 'bg-orange-100 dark:bg-orange-950', fg: 'text-orange-600 dark:text-orange-300' },
  { bg: 'bg-rose-100 dark:bg-rose-950', fg: 'text-rose-600 dark:text-rose-300' },
  { bg: 'bg-pink-100 dark:bg-pink-950', fg: 'text-pink-600 dark:text-pink-300' },
  { bg: 'bg-fuchsia-100 dark:bg-fuchsia-950', fg: 'text-fuchsia-600 dark:text-fuchsia-300' },
];

function hashString(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash;
}

export interface CategoryStyle {
  icon: LucideIcon;
  bg: string;
  fg: string;
}

const expenseStyles: Record<string, CategoryStyle> = {
  Shopping: { icon: ShoppingBag, bg: 'bg-rose-100 dark:bg-rose-950', fg: 'text-rose-600 dark:text-rose-300' },
  Food: { icon: Coffee, bg: 'bg-orange-100 dark:bg-orange-950', fg: 'text-orange-600 dark:text-orange-300' },
  Phone: { icon: Smartphone, bg: 'bg-sky-100 dark:bg-sky-950', fg: 'text-sky-600 dark:text-sky-300' },
  Entertainment: { icon: Gamepad2, bg: 'bg-violet-100 dark:bg-violet-950', fg: 'text-violet-600 dark:text-violet-300' },
  Education: { icon: GraduationCap, bg: 'bg-indigo-100 dark:bg-indigo-950', fg: 'text-indigo-600 dark:text-indigo-300' },
  Beauty: { icon: Scissors, bg: 'bg-pink-100 dark:bg-pink-950', fg: 'text-pink-600 dark:text-pink-300' },
  Sports: { icon: Dumbbell, bg: 'bg-emerald-100 dark:bg-emerald-950', fg: 'text-emerald-600 dark:text-emerald-300' },
  Social: { icon: Users, bg: 'bg-amber-100 dark:bg-amber-950', fg: 'text-amber-600 dark:text-amber-300' },
  Transportation: { icon: Bus, bg: 'bg-cyan-100 dark:bg-cyan-950', fg: 'text-cyan-600 dark:text-cyan-300' },
  Clothing: { icon: Shirt, bg: 'bg-fuchsia-100 dark:bg-fuchsia-950', fg: 'text-fuchsia-600 dark:text-fuchsia-300' },
  Car: { icon: Car, bg: 'bg-slate-200 dark:bg-slate-800', fg: 'text-slate-700 dark:text-slate-200' },
  Alcohol: { icon: Wine, bg: 'bg-red-100 dark:bg-red-950', fg: 'text-red-600 dark:text-red-300' },
  Cigarettes: { icon: Cigarette, bg: 'bg-stone-200 dark:bg-stone-800', fg: 'text-stone-700 dark:text-stone-200' },
  Electronics: { icon: Zap, bg: 'bg-yellow-100 dark:bg-yellow-950', fg: 'text-yellow-700 dark:text-yellow-300' },
  Travel: { icon: Plane, bg: 'bg-blue-100 dark:bg-blue-950', fg: 'text-blue-600 dark:text-blue-300' },
  Health: { icon: Heart, bg: 'bg-rose-100 dark:bg-rose-950', fg: 'text-rose-600 dark:text-rose-300' },
  Pets: { icon: Dog, bg: 'bg-amber-100 dark:bg-amber-950', fg: 'text-amber-700 dark:text-amber-300' },
  Repairs: { icon: Wrench, bg: 'bg-zinc-200 dark:bg-zinc-800', fg: 'text-zinc-700 dark:text-zinc-200' },
  Housing: { icon: HousePlus, bg: 'bg-teal-100 dark:bg-teal-950', fg: 'text-teal-600 dark:text-teal-300' },
  Home: { icon: Sofa, bg: 'bg-emerald-100 dark:bg-emerald-950', fg: 'text-emerald-700 dark:text-emerald-300' },
  Gifts: { icon: Gift, bg: 'bg-pink-100 dark:bg-pink-950', fg: 'text-pink-600 dark:text-pink-300' },
  Donations: { icon: HandHeart, bg: 'bg-rose-100 dark:bg-rose-950', fg: 'text-rose-600 dark:text-rose-300' },
  Lottery: { icon: Dices, bg: 'bg-purple-100 dark:bg-purple-950', fg: 'text-purple-600 dark:text-purple-300' },
  Snacks: { icon: Cookie, bg: 'bg-amber-100 dark:bg-amber-950', fg: 'text-amber-700 dark:text-amber-300' },
  Kids: { icon: Cake, bg: 'bg-pink-100 dark:bg-pink-950', fg: 'text-pink-600 dark:text-pink-300' },
  Vegetables: { icon: Carrot, bg: 'bg-orange-100 dark:bg-orange-950', fg: 'text-orange-600 dark:text-orange-300' },
  Fruits: { icon: Cherry, bg: 'bg-red-100 dark:bg-red-950', fg: 'text-red-600 dark:text-red-300' },
  Bills: { icon: Receipt, bg: 'bg-slate-200 dark:bg-slate-800', fg: 'text-slate-700 dark:text-slate-200' },
  Medicine: { icon: Pill, bg: 'bg-rose-100 dark:bg-rose-950', fg: 'text-rose-600 dark:text-rose-300' },
  Recharge: { icon: Phone, bg: 'bg-sky-100 dark:bg-sky-950', fg: 'text-sky-600 dark:text-sky-300' },
  Other: { icon: Package, bg: 'bg-slate-200 dark:bg-slate-800', fg: 'text-slate-700 dark:text-slate-200' },
};

const incomeStyles: Record<string, CategoryStyle> = {
  Salary: { icon: Briefcase, bg: 'bg-emerald-100 dark:bg-emerald-950', fg: 'text-emerald-600 dark:text-emerald-300' },
  Investments: { icon: TrendingUp, bg: 'bg-indigo-100 dark:bg-indigo-950', fg: 'text-indigo-600 dark:text-indigo-300' },
  'Part-Time': { icon: HandCoins, bg: 'bg-amber-100 dark:bg-amber-950', fg: 'text-amber-700 dark:text-amber-300' },
  Bonus: { icon: Trophy, bg: 'bg-yellow-100 dark:bg-yellow-950', fg: 'text-yellow-700 dark:text-yellow-300' },
  Gift: { icon: Gift, bg: 'bg-pink-100 dark:bg-pink-950', fg: 'text-pink-600 dark:text-pink-300' },
  Refund: { icon: RotateCcw, bg: 'bg-cyan-100 dark:bg-cyan-950', fg: 'text-cyan-600 dark:text-cyan-300' },
  Others: { icon: Coins, bg: 'bg-slate-200 dark:bg-slate-800', fg: 'text-slate-700 dark:text-slate-200' },
};

function customStyle(name: string): CategoryStyle {
  const palette = fallbackPalettes[hashString(name) % fallbackPalettes.length];
  return { icon: Tag, bg: palette.bg, fg: palette.fg };
}

export function getExpenseCategoryStyle(category: ExpenseCategory): CategoryStyle {
  return expenseStyles[category] ?? customStyle(category || 'Other');
}

export function getIncomeCategoryStyle(category: IncomeCategory): CategoryStyle {
  return incomeStyles[category] ?? customStyle(category || 'Others');
}

// Suppress unused import warnings for icons used in optional/future mappings
void Apple;
void Banknote;
void Beef;
void Bike;
void CreditCard;
void Film;
void Sparkles;
void Stethoscope;

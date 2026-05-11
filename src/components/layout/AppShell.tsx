import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, BarChart3, Bell, Home, Plus, Settings, Shield, UserRound, WalletCards } from 'lucide-react';
import { clsx } from 'clsx';
import { GlobalAddSheet } from './GlobalAddSheet';
import { useAuthStore } from '../../state/useAuthStore';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useUiStore } from '../../state/useUiStore';
import { getUpcomingReminders, predictRecurringExpenses } from '../../lib/reminders';

const baseTabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/transactions', label: 'Records', icon: WalletCards },
  { to: '/people', label: 'People', icon: UserRound },
  { to: '/obligations', label: 'Obligations', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const titles: Record<string, string> = {
  '/': 'Home',
  '/transactions': 'Records',
  '/people': 'People',
  '/obligations': 'Obligations',
  '/reminders': 'Reminders',
  '/budgets': 'Budgets',
  '/wallets': 'Wallets',
  '/goals': 'Goals',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/admin': 'Superadmin',
};

export function AppShell() {
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const account = useAuthStore((state) => state.account);
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperadmin = account?.role === 'superadmin';
  const expenses = useFinanceStore((state) => state.expenses);
  const loans = useFinanceStore((state) => state.loans);
  const loanPayments = useFinanceStore((state) => state.loanPayments);
  const items = useFinanceStore((state) => state.items);
  const subscriptions = useFinanceStore((state) => state.subscriptions);
  const reminderCount = !isSuperadmin
    ? getUpcomingReminders(loans, loanPayments, items, subscriptions, 14).length +
      predictRecurringExpenses(expenses, 7).length
    : 0;
  const title = isSuperadmin && location.pathname === '/' ? 'Superadmin' : (titles[location.pathname] ?? 'Expense Tracker');
  const tabs = isSuperadmin
    ? [
        { to: '/', label: 'Home', icon: Shield },
        { to: '/settings', label: 'Settings', icon: Settings },
      ]
    : baseTabs;

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="safe-top sticky top-0 z-30 border-b border-zinc-200/80 bg-zinc-50/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="gradient-brand grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-white shadow-sm">
              E
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                Expense Tracker
              </p>
              <h1 className="text-lg font-black tracking-tight">{title}</h1>
            </div>
          </div>
          {!isSuperadmin ? (
            <button
              type="button"
              onClick={() => navigate('/reminders')}
              className="relative grid h-10 w-10 place-items-center rounded-xl bg-white text-zinc-700 ring-1 ring-zinc-200 active:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-800"
              aria-label="Reminders"
            >
              <Bell size={18} />
              {reminderCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[0.65rem] font-black text-white">
                  {reminderCount > 9 ? '9+' : reminderCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-32 pt-4">
        <Outlet />
      </main>

      {!isSuperadmin ? (
        <button
          type="button"
          onClick={() => openAddFlow('chooser')}
          className="gradient-brand fixed bottom-[5.6rem] left-1/2 z-40 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full text-white shadow-xl shadow-indigo-900/30 active:scale-95"
          aria-label="Add"
        >
          <Plus size={28} strokeWidth={2.4} />
        </button>
      ) : null}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto grid h-20 max-w-xl px-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-[0.68rem] font-bold tracking-tight transition',
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={clsx(
                        'grid h-8 w-10 place-items-center rounded-full transition',
                        isActive ? 'bg-indigo-50 dark:bg-indigo-950' : 'bg-transparent',
                      )}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.6 : 2.2} />
                    </span>
                    <span className="truncate">{tab.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
      <GlobalAddSheet />
    </div>
  );
}

void ArrowLeftRight;

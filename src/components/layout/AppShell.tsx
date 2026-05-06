import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Home, Plus, Settings, Shield, UserRound, WalletCards } from 'lucide-react';
import { clsx } from 'clsx';
import { GlobalAddSheet } from './GlobalAddSheet';
import { useAuthStore } from '../../state/useAuthStore';
import { useUiStore } from '../../state/useUiStore';

const baseTabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/transactions', label: 'Transactions', icon: WalletCards },
  { to: '/people', label: 'People', icon: UserRound },
  { to: '/obligations', label: 'Obligations', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const titles: Record<string, string> = {
  '/': 'Expense Tracker',
  '/transactions': 'Transactions',
  '/people': 'People',
  '/obligations': 'Obligations',
  '/settings': 'Settings',
  '/admin': 'Superadmin',
};

export function AppShell() {
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const account = useAuthStore((state) => state.account);
  const location = useLocation();
  const isSuperadmin = account?.role === 'superadmin';
  const title = isSuperadmin && location.pathname === '/' ? 'Superadmin' : (titles[location.pathname] ?? 'Expense Tracker');
  const tabs = isSuperadmin
    ? [
        { to: '/', label: 'Home', icon: Shield },
        { to: '/settings', label: 'Settings', icon: Settings },
      ]
    : baseTabs;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="safe-top sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">Expense Tracker</p>
            <h1 className="text-xl font-black">{title}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-32 pt-4">
        <Outlet />
      </main>

      {!isSuperadmin ? (
        <button
          type="button"
          onClick={() => openAddFlow('chooser')}
          className="fixed bottom-[5.6rem] left-1/2 z-40 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-teal-700 text-white shadow-xl shadow-teal-900/20 active:scale-95"
          aria-label="Add"
        >
          <Plus size={28} />
        </button>
      ) : null}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
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
                    'flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-[0.68rem] font-bold transition',
                    isActive ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={clsx(
                        'grid h-8 w-10 place-items-center rounded-full transition',
                        isActive ? 'bg-teal-50 dark:bg-teal-950' : 'bg-transparent',
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

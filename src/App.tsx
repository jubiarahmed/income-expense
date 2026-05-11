import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AppShell } from './components/layout/AppShell';
import { Toaster } from './components/ui/Toaster';
import { ActivityPage } from './features/activity/ActivityPage';
import { AdminPage } from './features/admin/AdminPage';
import { AuthPage } from './features/auth/AuthPage';
import { BudgetsPage } from './features/budgets/BudgetsPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { GoalsPage } from './features/goals/GoalsPage';
import { ObligationsPage } from './features/obligations/ObligationsPage';
import { PeoplePage } from './features/people/PeoplePage';
import { RemindersPage } from './features/reminders/RemindersPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TagsPage } from './features/tags/TagsPage';
import { TemplatesPage } from './features/templates/TemplatesPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { WalletsPage } from './features/wallets/WalletsPage';
import { useAuthStore } from './state/useAuthStore';
import { useFinanceStore } from './state/useFinanceStore';

export default function App() {
  const account = useAuthStore((state) => state.account);
  const initAuth = useAuthStore((state) => state.init);
  const authInitialized = useAuthStore((state) => state.initialized);
  const authError = useAuthStore((state) => state.error);
  const initFinance = useFinanceStore((state) => state.init);
  const clearFinanceSession = useFinanceStore((state) => state.clearSession);
  const financeAccountId = useFinanceStore((state) => state.accountId);
  const financeInitialized = useFinanceStore((state) => state.initialized);
  const financeError = useFinanceStore((state) => state.error);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (account && financeAccountId !== account.id) {
      void initFinance(account.id);
    }
    if (!account) {
      clearFinanceSession();
    }
  }, [account, clearFinanceSession, financeAccountId, initFinance]);

  const shouldWaitForFinance = Boolean(account && (!financeInitialized || financeAccountId !== account.id) && !financeError);

  if (!authInitialized || shouldWaitForFinance) {
    return (
      <main className="grid min-h-dvh place-items-center bg-zinc-50 p-6 dark:bg-zinc-950">
        <div className="text-center">
          <div className="gradient-brand mx-auto grid h-16 w-16 place-items-center rounded-3xl text-2xl font-black text-white shadow-xl shadow-indigo-900/30">
            E
          </div>
          <p className="mt-4 text-sm font-bold tracking-tight text-zinc-500">Opening Expense Tracker…</p>
        </div>
      </main>
    );
  }

  if (authError && !account) {
    return <AuthPage />;
  }

  if (!account) {
    return <AuthPage />;
  }

  if (financeError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-zinc-50 p-6 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-black tracking-tight">Could not open Expense Tracker</h1>
          <p className="mt-2 text-sm text-zinc-500">{financeError}</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={account.role === 'superadmin' ? <AdminPage /> : <DashboardPage />} />
          <Route path="transactions" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <TransactionsPage />} />
          <Route path="people" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <PeoplePage />} />
          <Route path="obligations" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <ObligationsPage />} />
          <Route path="reminders" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <RemindersPage />} />
          <Route path="budgets" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <BudgetsPage />} />
          <Route path="wallets" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <WalletsPage />} />
          <Route path="goals" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <GoalsPage />} />
          <Route path="reports" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <ReportsPage />} />
          <Route path="calendar" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <CalendarPage />} />
          <Route path="tags" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <TagsPage />} />
          <Route path="templates" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <TemplatesPage />} />
          <Route path="activity" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <ActivityPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <Navigate to="/" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <Analytics />
    </>
  );
}

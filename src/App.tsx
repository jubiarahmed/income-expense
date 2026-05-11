import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AppShell } from './components/layout/AppShell';
import { Toaster } from './components/ui/Toaster';
import { AuthPage } from './features/auth/AuthPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { useAuthStore } from './state/useAuthStore';
import { useFinanceStore } from './state/useFinanceStore';

// Secondary pages are lazy-loaded to keep the initial bundle small.
// Vite will emit each as a separate chunk; the Suspense fallback shows a brief shimmer.
const AdminPage = lazy(() => import('./features/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
const ActivityPage = lazy(() => import('./features/activity/ActivityPage').then((m) => ({ default: m.ActivityPage })));
const BudgetsPage = lazy(() => import('./features/budgets/BudgetsPage').then((m) => ({ default: m.BudgetsPage })));
const CalendarPage = lazy(() => import('./features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const GoalsPage = lazy(() => import('./features/goals/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const ObligationsPage = lazy(() => import('./features/obligations/ObligationsPage').then((m) => ({ default: m.ObligationsPage })));
const PeoplePage = lazy(() => import('./features/people/PeoplePage').then((m) => ({ default: m.PeoplePage })));
const RemindersPage = lazy(() => import('./features/reminders/RemindersPage').then((m) => ({ default: m.RemindersPage })));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TagsPage = lazy(() => import('./features/tags/TagsPage').then((m) => ({ default: m.TagsPage })));
const TemplatesPage = lazy(() => import('./features/templates/TemplatesPage').then((m) => ({ default: m.TemplatesPage })));
const WalletsPage = lazy(() => import('./features/wallets/WalletsPage').then((m) => ({ default: m.WalletsPage })));

function RouteFallback() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <div className="text-center">
        <div className="gradient-brand mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-2xl text-base font-black text-white">
          E
        </div>
        <p className="mt-3 text-xs font-bold tracking-tight text-zinc-500">Loading…</p>
      </div>
    </div>
  );
}

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
          <Route
            index
            element={
              account.role === 'superadmin' ? (
                <Suspense fallback={<RouteFallback />}>
                  <AdminPage />
                </Suspense>
              ) : (
                <DashboardPage />
              )
            }
          />
          <Route path="transactions" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <TransactionsPage />} />
          <Route
            path="people"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <PeoplePage />
                </Suspense>
              )
            }
          />
          <Route
            path="obligations"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <ObligationsPage />
                </Suspense>
              )
            }
          />
          <Route
            path="reminders"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <RemindersPage />
                </Suspense>
              )
            }
          />
          <Route
            path="budgets"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <BudgetsPage />
                </Suspense>
              )
            }
          />
          <Route
            path="wallets"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <WalletsPage />
                </Suspense>
              )
            }
          />
          <Route
            path="goals"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <GoalsPage />
                </Suspense>
              )
            }
          />
          <Route
            path="reports"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <ReportsPage />
                </Suspense>
              )
            }
          />
          <Route
            path="calendar"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <CalendarPage />
                </Suspense>
              )
            }
          />
          <Route
            path="tags"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <TagsPage />
                </Suspense>
              )
            }
          />
          <Route
            path="templates"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <TemplatesPage />
                </Suspense>
              )
            }
          />
          <Route
            path="activity"
            element={
              account.role === 'superadmin' ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  <ActivityPage />
                </Suspense>
              )
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<RouteFallback />}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route path="admin" element={account.role === 'superadmin' ? <Navigate to="/" replace /> : <Navigate to="/" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <Analytics />
    </>
  );
}

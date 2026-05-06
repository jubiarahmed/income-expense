import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LockKeyhole, WalletCards } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, TextInput } from '../../components/ui/Form';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useAuthStore } from '../../state/useAuthStore';
import { apiFetch } from '../../lib/api';

type AuthMode = 'signin' | 'signup';

export function AuthPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const loading = useAuthStore((state) => state.loading);
  const storeError = useAuthStore((state) => state.error);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creationEnabled, setCreationEnabled] = useState(true);
  const [checkedCreation, setCheckedCreation] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void apiFetch<{ accountCreationEnabled: boolean; accountCount: number }>('/api/auth?action=registration').then((settings) => {
      setCreationEnabled(settings.accountCreationEnabled);
      setCheckedCreation(true);
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (mode === 'signin') {
        await signIn({ email, password });
      } else {
        await signUp({ name, email, password, confirmPassword });
      }
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed');
    }
  }

  return (
    <main className="safe-top min-h-dvh bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center">
        <div className="mb-8">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-teal-700 text-white shadow-xl shadow-teal-900/20">
            <WalletCards size={30} />
          </div>
          <h1 className="mt-5 text-4xl font-black">Expense Tracker</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to your local account to track expenses, dues, loans, items, and recurring bills on this device.
          </p>
        </div>

        <Card className="space-y-5">
          <SegmentedControl
            value={mode}
            onChange={(nextMode) => {
              setMode(nextMode);
              setError('');
            }}
            options={[
              { label: 'Sign in', value: 'signin' },
              { label: 'Create', value: 'signup' },
            ]}
          />

          <form className="space-y-4" onSubmit={submit}>
            {mode === 'signup' ? (
              <Field label="Name">
                <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required />
              </Field>
            ) : null}

            {mode === 'signup' && checkedCreation && !creationEnabled ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                New account creation is currently disabled by the platform administrator.
              </p>
            ) : null}

            <Field label="Email">
              <TextInput
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Password">
              <TextInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
            </Field>

            {mode === 'signup' ? (
              <Field label="Confirm password">
                <TextInput
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </Field>
            ) : null}

            {error || storeError ? (
              <div
                key={error || storeError}
                role="alert"
                className="shake flex items-start gap-3 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200 dark:bg-rose-950 dark:ring-rose-800"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-300" />
                <p className="text-sm font-semibold leading-5 text-rose-700 dark:text-rose-200">{error || storeError}</p>
              </div>
            ) : null}

            <Button className="w-full" type="submit" disabled={loading || (mode === 'signup' && checkedCreation && !creationEnabled)} icon={<LockKeyhole size={16} />}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}

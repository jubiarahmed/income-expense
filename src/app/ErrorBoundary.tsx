import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../components/ui/Button';

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Expense Tracker crashed', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 text-slate-950">
        <section className="max-w-sm rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-black">Expense Tracker hit an error</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{this.state.message ?? 'Please reload the app and try again.'}</p>
          <Button className="mt-4 w-full" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </section>
      </main>
    );
  }
}

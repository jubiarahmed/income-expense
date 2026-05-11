// Sentry is opt-in via VITE_SENTRY_DSN. When it's not set, the SDK never loads —
// keeping the main bundle small. When it is set, we lazy-import the SDK at startup
// and queue any pre-init events so they're flushed once it resolves.

type SentryLike = {
  captureException: (error: unknown, context?: unknown) => void;
  captureMessage: (message: string, level?: string) => void;
};

const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined) || '';

// Buffer events that arrive before the SDK finishes loading.
const pending: Array<(s: SentryLike) => void> = [];
let real: SentryLike | null = null;

if (dsn) {
  void (async () => {
    try {
      const SentryModule = await import('@sentry/react');
      SentryModule.init({
        dsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
        sendDefaultPii: false,
        integrations: [SentryModule.browserTracingIntegration()],
      });
      real = {
        captureException: (error, context) => SentryModule.captureException(error, context as never),
        captureMessage: (message, level) => SentryModule.captureMessage(message, (level as never) ?? 'info'),
      };
      while (pending.length) pending.shift()!(real);
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[sentry] enabled');
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[sentry] failed to load', err);
      }
    }
  })();
}

export const sentry: SentryLike = {
  captureException(error, context) {
    if (real) real.captureException(error, context);
    else if (dsn) pending.push((s) => s.captureException(error, context));
  },
  captureMessage(message, level) {
    if (real) real.captureMessage(message, level);
    else if (dsn) pending.push((s) => s.captureMessage(message, level));
  },
};

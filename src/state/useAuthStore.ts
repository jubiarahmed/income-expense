import { create } from 'zustand';
import type { Account } from '../domain/models';
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from '../domain/validation';
import { apiFetch, postApi } from '../lib/api';

interface AuthState {
  account?: Account;
  initialized: boolean;
  loading: boolean;
  error?: string;
  init: () => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  account: undefined,
  initialized: false,
  loading: false,
  error: undefined,

  init: async () => {
    set({ loading: true, error: undefined });
    try {
      const result = await apiFetch<{ account?: Account }>('/api/auth?action=session');
      set({ account: result.account, initialized: true, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unable to open account session',
        initialized: true,
        loading: false,
      });
    }
  },

  signUp: async (input) => {
    const parsed = signUpSchema.parse(input);
    set({ loading: true, error: undefined });
    try {
      const result = await postApi<{ account: Account }>('/api/auth?action=signup', parsed);
      set({ account: result.account, initialized: true, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not create account', loading: false });
      throw error;
    }
  },

  signIn: async (input) => {
    const parsed = signInSchema.parse(input);
    set({ loading: true, error: undefined });
    try {
      const result = await postApi<{ account: Account }>('/api/auth?action=signin', parsed);
      set({ account: result.account, initialized: true, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not sign in', loading: false });
      throw error;
    }
  },

  signOut: async () => {
    await postApi('/api/auth?action=signout', {});
    set({ account: undefined, error: undefined, loading: false, initialized: true });
  },

  refreshAccount: async () => {
    const result = await apiFetch<{ account?: Account }>('/api/auth?action=session');
    set({ account: result.account, loading: false, initialized: true });
  },
}));

import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface Toast {
  id: string;
  message: string;
  action?: ToastAction;
  tone?: 'info' | 'danger' | 'success';
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, options?: { action?: ToastAction; tone?: Toast['tone']; duration?: number }) => string;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, options) => {
    counter += 1;
    const id = `toast_${counter}_${Date.now()}`;
    const toast: Toast = { id, message, action: options?.action, tone: options?.tone };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    const duration = options?.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration);
    }
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

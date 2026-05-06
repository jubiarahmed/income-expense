import { create } from 'zustand';

export type AddFlowType = 'chooser' | 'expense' | 'sharedExpense' | 'loan' | 'item' | 'subscription' | 'contact' | 'sharedGroup';

interface UiState {
  activeAddFlow?: AddFlowType;
  openAddFlow: (flow: AddFlowType) => void;
  closeAddFlow: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeAddFlow: undefined,
  openAddFlow: (flow) => set({ activeAddFlow: flow }),
  closeAddFlow: () => set({ activeAddFlow: undefined }),
}));

import { create } from 'zustand';

export type AddFlowType =
  | 'chooser'
  | 'expense'
  | 'income'
  | 'transfer'
  | 'sharedExpense'
  | 'loan'
  | 'item'
  | 'subscription'
  | 'contact'
  | 'sharedGroup';

export type ChooserTab = 'expense' | 'income' | 'transfer';

interface UiState {
  activeAddFlow?: AddFlowType;
  chooserTab: ChooserTab;
  openAddFlow: (flow: AddFlowType) => void;
  setChooserTab: (tab: ChooserTab) => void;
  closeAddFlow: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeAddFlow: undefined,
  chooserTab: 'expense',
  openAddFlow: (flow) => set({ activeAddFlow: flow }),
  setChooserTab: (tab) => set({ chooserTab: tab }),
  closeAddFlow: () => set({ activeAddFlow: undefined }),
}));

import { create } from 'zustand';
import type {
  NavView,
  SourceType,
  InsightType,
  InsightStatus,
} from './types';

// ─── Filter Shapes ──────────────────────────────────────────────────────────

export interface MemoryFilters {
  sourceType: SourceType | null;
  connectorId: string | null;
  sortBy: string;
  sortOrder: string;
}

export interface InsightFilters {
  type: InsightType | null;
  status: InsightStatus | null;
}

// ─── State Shape ────────────────────────────────────────────────────────────

interface CortexUIState {
  // Navigation
  currentView: NavView;
  sidebarOpen: boolean;

  // Selections
  selectedConnectorId: string | null;
  selectedMemoryId: string | null;
  selectedInsightId: string | null;
  selectedSessionId: string | null;

  // Memory search & filters
  memorySearchQuery: string;
  memoryFilters: MemoryFilters;

  // Insight filters
  insightFilters: InsightFilters;

  // Actions — Navigation
  setCurrentView: (view: NavView) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Actions — Selections
  selectConnector: (id: string | null) => void;
  selectMemory: (id: string | null) => void;
  selectInsight: (id: string | null) => void;
  selectSession: (id: string | null) => void;

  // Actions — Memory
  setMemorySearch: (query: string) => void;
  setMemoryFilters: (filters: Partial<MemoryFilters>) => void;
  resetMemoryFilters: () => void;

  // Actions — Insights
  setInsightFilters: (filters: Partial<InsightFilters>) => void;
  resetInsightFilters: () => void;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const defaultMemoryFilters: MemoryFilters = {
  sourceType: null,
  connectorId: null,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const defaultInsightFilters: InsightFilters = {
  type: null,
  status: null,
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useCortexStore = create<CortexUIState>((set) => ({
  // Navigation
  currentView: 'dashboard',
  sidebarOpen: true,

  // Selections
  selectedConnectorId: null,
  selectedMemoryId: null,
  selectedInsightId: null,
  selectedSessionId: null,

  // Memory
  memorySearchQuery: '',
  memoryFilters: { ...defaultMemoryFilters },

  // Insights
  insightFilters: { ...defaultInsightFilters },

  // Actions — Navigation
  setCurrentView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Actions — Selections
  selectConnector: (id) => set({ selectedConnectorId: id }),
  selectMemory: (id) => set({ selectedMemoryId: id }),
  selectInsight: (id) => set({ selectedInsightId: id }),
  selectSession: (id) => set({ selectedSessionId: id }),

  // Actions — Memory
  setMemorySearch: (query) => set({ memorySearchQuery: query }),
  setMemoryFilters: (filters) =>
    set((s) => ({ memoryFilters: { ...s.memoryFilters, ...filters } })),
  resetMemoryFilters: () => set({ memoryFilters: { ...defaultMemoryFilters } }),

  // Actions — Insights
  setInsightFilters: (filters) =>
    set((s) => ({ insightFilters: { ...s.insightFilters, ...filters } })),
  resetInsightFilters: () => set({ insightFilters: { ...defaultInsightFilters } }),
}));

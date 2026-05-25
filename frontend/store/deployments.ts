import { create } from 'zustand';
import type { Deployment, FieldConfig, FilterState } from '@/types';
import { applyFilters } from '@/lib/filter';

export interface StoreState {
  rawData: Deployment[];
  fieldConfig: FieldConfig | null;
  prefetchComplete: boolean;
  serverPageItems: Deployment[] | null;
  serverPageCount: number | null;
  serverTotal: number | null;
  lastFetchedAt: string | null;
  fetchError: string | null;
  toastMessage: string | null;
  filterState: FilterState;
  viewData: Deployment[];
  openPanelId: string | null;
  // track which fields are actively being edited to guard re-fetch
  activeEdits: Set<string>; // `${deployment_id}:${fieldPath}`
  // count of in-flight requests (prefetch pages + PATCH calls); drives the header spinner
  pendingRequests: number;

  setRawData: (data: Deployment[]) => void;
  mergeRawData: (updates: Deployment[]) => void;
  updateRecord: (updated: Deployment) => void;
  setFieldConfig: (fc: FieldConfig) => void;
  setPrefetchComplete: (v: boolean) => void;
  setServerPage: (items: Deployment[], total: number, pageCount: number) => void;
  clearServerPage: () => void;
  setLastFetchedAt: (ts: string) => void;
  setFetchError: (err: string | null) => void;
  setToastMessage: (msg: string | null) => void;
  setFilterState: (fs: FilterState) => void;
  setOpenPanelId: (id: string | null) => void;
  registerEdit: (key: string) => void;
  unregisterEdit: (key: string) => void;
  isFieldBeingEdited: (deploymentId: string, fieldPath: string) => boolean;
  incrementPending: () => void;
  decrementPending: () => void;
}

const DEFAULT_FILTER_STATE: FilterState = {
  chips: [],
  status: [],
  type: [],
  environment: [],
  view: 'existing',
  sort: 'created_at',
  order: 'desc',
};

function deriveViewData(rawData: Deployment[], filterState: FilterState): Deployment[] {
  return applyFilters(rawData, filterState);
}

function copyField<T>(target: T, source: T, key: keyof T): void {
  target[key] = source[key];
}

export const useDeploymentsStore = create<StoreState>((set, get) => ({
  rawData: [],
  fieldConfig: null,
  prefetchComplete: false,
  serverPageItems: null,
  serverPageCount: null,
  serverTotal: null,
  lastFetchedAt: null,
  fetchError: null,
  toastMessage: null,
  filterState: DEFAULT_FILTER_STATE,
  viewData: [],
  openPanelId: null,
  activeEdits: new Set(),
  pendingRequests: 0,

  setRawData: (data) =>
    set((state) => ({
      rawData: data,
      viewData: deriveViewData(data, state.filterState),
    })),

  mergeRawData: (updates) =>
    set((state) => {
      const editSet = state.activeEdits;
      const map = new Map(state.rawData.map((d) => [d.deployment_id, d]));
      for (const update of updates) {
        const existing = map.get(update.deployment_id);
        if (existing) {
          // Merge, but protect fields actively being edited
          const merged: Deployment = { ...existing };
          for (const key of Object.keys(update) as Array<keyof Deployment>) {
            if (key === 'attributes') {
              const mergedAttrs = { ...existing.attributes };
              for (const [attrKey, attrVal] of Object.entries(update.attributes)) {
                const editKey = `${update.deployment_id}:attributes.${attrKey}`;
                if (!editSet.has(editKey)) {
                  mergedAttrs[attrKey] = attrVal;
                }
              }
              merged.attributes = mergedAttrs;
            } else {
              copyField(merged, update, key);
            }
          }
          map.set(update.deployment_id, merged);
        } else {
          map.set(update.deployment_id, update);
        }
      }
      const newRaw = Array.from(map.values());
      return {
        rawData: newRaw,
        viewData: deriveViewData(newRaw, state.filterState),
      };
    }),

  updateRecord: (updated) =>
    set((state) => {
      let found = false;
      const newRaw = state.rawData.map((d) => {
        if (d.deployment_id === updated.deployment_id) { found = true; return updated; }
        return d;
      });
      if (!found) newRaw.push(updated);
      const newServerPageItems = state.serverPageItems
        ? state.serverPageItems.map((d) =>
            d.deployment_id === updated.deployment_id ? updated : d)
        : null;
      return {
        rawData: newRaw,
        viewData: deriveViewData(newRaw, state.filterState),
        serverPageItems: newServerPageItems,
      };
    }),

  setFieldConfig: (fc) => set({ fieldConfig: fc }),
  setPrefetchComplete: (v) => set({ prefetchComplete: v }),
  setServerPage: (items, total, pageCount) =>
    set({ serverPageItems: items, serverTotal: total, serverPageCount: pageCount }),
  clearServerPage: () =>
    set({ serverPageItems: null, serverTotal: null, serverPageCount: null }),
  setLastFetchedAt: (ts) => set({ lastFetchedAt: ts }),
  setFetchError: (err) => set({ fetchError: err, toastMessage: err }),
  setToastMessage: (msg) => set({ toastMessage: msg }),

  setFilterState: (fs) =>
    set((state) => ({
      filterState: fs,
      viewData: deriveViewData(state.rawData, fs),
    })),

  setOpenPanelId: (id) => set({ openPanelId: id }),

  registerEdit: (key) =>
    set((state) => {
      const next = new Set(state.activeEdits);
      next.add(key);
      return { activeEdits: next };
    }),

  unregisterEdit: (key) =>
    set((state) => {
      const next = new Set(state.activeEdits);
      next.delete(key);
      return { activeEdits: next };
    }),

  isFieldBeingEdited: (deploymentId, fieldPath) => {
    return get().activeEdits.has(`${deploymentId}:${fieldPath}`);
  },

  incrementPending: () => set((state) => ({ pendingRequests: state.pendingRequests + 1 })),
  decrementPending: () => set((state) => ({ pendingRequests: Math.max(0, state.pendingRequests - 1) })),
}));

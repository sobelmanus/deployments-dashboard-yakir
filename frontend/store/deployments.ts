import { create } from 'zustand';
import type { Deployment, FieldConfig, FilterState } from '@/types';
import { applyFilters } from '@/lib/filter';

export interface StoreState {
  rawData: Deployment[];
  fieldConfig: FieldConfig | null;
  prefetchComplete: boolean;
  lastFetchedAt: string | null;
  fetchError: string | null;
  filterState: FilterState;
  viewData: Deployment[];
  openPanelId: string | null;
  // track which fields are actively being edited to guard re-fetch
  activeEdits: Set<string>; // `${deployment_id}:${fieldPath}`

  setRawData: (data: Deployment[]) => void;
  mergeRawData: (updates: Deployment[]) => void;
  updateRecord: (updated: Deployment) => void;
  setFieldConfig: (fc: FieldConfig) => void;
  setPrefetchComplete: (v: boolean) => void;
  setLastFetchedAt: (ts: string) => void;
  setFetchError: (err: string | null) => void;
  setFilterState: (fs: FilterState) => void;
  setOpenPanelId: (id: string | null) => void;
  registerEdit: (key: string) => void;
  unregisterEdit: (key: string) => void;
  isFieldBeingEdited: (deploymentId: string, fieldPath: string) => boolean;
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
  lastFetchedAt: null,
  fetchError: null,
  filterState: DEFAULT_FILTER_STATE,
  viewData: [],
  openPanelId: null,
  activeEdits: new Set(),

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
      return {
        rawData: newRaw,
        viewData: deriveViewData(newRaw, state.filterState),
      };
    }),

  setFieldConfig: (fc) => set({ fieldConfig: fc }),
  setPrefetchComplete: (v) => set({ prefetchComplete: v }),
  setLastFetchedAt: (ts) => set({ lastFetchedAt: ts }),
  setFetchError: (err) => set({ fetchError: err }),

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
}));

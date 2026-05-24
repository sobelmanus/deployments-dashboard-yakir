import type { FilterState } from '@/types';

const DEFAULT_SORT = 'created_at';
const DEFAULT_ORDER: 'asc' | 'desc' = 'desc';
const DEFAULT_VIEW: 'existing' | 'deleted' | 'all' = 'existing';

export function parseUrlState(search: string): {
  filterState: FilterState;
  openPanelId: string | null;
} {
  const params = new URLSearchParams(search);

  const chips = params.getAll('search').map((raw) => {
    const colonIdx = raw.indexOf(':');
    if (colonIdx === -1) return { field: 'all', value: raw };
    return { field: raw.slice(0, colonIdx), value: raw.slice(colonIdx + 1) };
  });

  const status = params.getAll('status');
  const type = params.getAll('type');
  const environment = params.getAll('environment');
  const sort = params.get('sort') ?? DEFAULT_SORT;
  const rawOrder = params.get('order');
  const order: 'asc' | 'desc' =
    rawOrder === 'asc' || rawOrder === 'desc' ? rawOrder : DEFAULT_ORDER;
  const rawView = params.get('view');
  const view: 'existing' | 'deleted' | 'all' =
    rawView === 'existing' || rawView === 'deleted' || rawView === 'all'
      ? rawView
      : DEFAULT_VIEW;

  const openPanelId = params.get('deployment');

  return {
    filterState: { chips, status, type, environment, sort, order, view },
    openPanelId,
  };
}

export function buildUrlParams(
  filterState: FilterState,
  openPanelId: string | null
): URLSearchParams {
  const params = new URLSearchParams();

  for (const chip of filterState.chips) {
    if (chip.value) {
      params.append('search', `${chip.field}:${chip.value}`);
    }
  }
  for (const s of filterState.status) params.append('status', s);
  for (const t of filterState.type) params.append('type', t);
  for (const e of filterState.environment) params.append('environment', e);

  if (filterState.sort !== DEFAULT_SORT) params.set('sort', filterState.sort);
  if (filterState.order !== DEFAULT_ORDER) params.set('order', filterState.order);
  if (filterState.view !== DEFAULT_VIEW) params.set('view', filterState.view);
  if (openPanelId) params.set('deployment', openPanelId);

  return params;
}

export function pushFilterState(
  filterState: FilterState,
  openPanelId: string | null,
  usePush: boolean
): void {
  const params = buildUrlParams(filterState, openPanelId);
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  if (usePush) {
    window.history.pushState({}, '', url);
  } else {
    window.history.replaceState({}, '', url);
  }
}

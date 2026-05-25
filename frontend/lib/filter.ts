import type { Deployment, FilterState } from '@/types';
import { getFieldValue } from './utils';

function matchesChip(
  deployment: Deployment,
  chip: { field: string; value: string }
): boolean {
  if (!chip.value) return true;
  const val = chip.value.toLowerCase();

  if (chip.field === 'all') {
    const searchable = [
      deployment.deployment_id,
      deployment.created_by,
      deployment.version,
      ...Object.values(deployment.attributes),
    ];
    return searchable.some((s) => s?.toLowerCase().includes(val));
  }

  return getFieldValue(deployment, chip.field).toLowerCase().includes(val);
}

export function applyFilters(
  data: Deployment[],
  filterState: FilterState
): Deployment[] {
  let result = data;

  // Delete toggle
  if (filterState.view === 'existing') {
    result = result.filter((d) => d.deleted_at === null);
  } else if (filterState.view === 'deleted') {
    result = result.filter((d) => d.deleted_at !== null);
  }

  // Enum filters
  if (filterState.status.length > 0) {
    result = result.filter((d) => filterState.status.includes(d.status));
  }
  if (filterState.type.length > 0) {
    result = result.filter((d) => filterState.type.includes(d.type));
  }
  if (filterState.environment.length > 0) {
    result = result.filter((d) => filterState.environment.includes(d.environment));
  }

  // Search chips (AND)
  for (const chip of filterState.chips) {
    result = result.filter((d) => matchesChip(d, chip));
  }

  // Sort — tiebreak by deployment_id to match backend's stable ordering
  result = [...result].sort((a, b) => {
    const aVal = getFieldValue(a, filterState.sort);
    const bVal = getFieldValue(b, filterState.sort);
    const cmp = aVal.localeCompare(bVal);
    if (cmp !== 0) return filterState.order === 'asc' ? cmp : -cmp;
    return a.deployment_id.localeCompare(b.deployment_id);
  });

  return result;
}

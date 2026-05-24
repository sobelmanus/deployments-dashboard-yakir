import type { Deployment, FilterState } from '@/types';

function getFieldValue(deployment: Deployment, fieldPath: string): string {
  if (fieldPath.startsWith('attributes.')) {
    const key = fieldPath.slice('attributes.'.length);
    return deployment.attributes[key] ?? '';
  }
  switch (fieldPath) {
    case 'deployment_id': return deployment.deployment_id;
    case 'version': return deployment.version;
    case 'status': return deployment.status;
    case 'type': return deployment.type;
    case 'environment': return deployment.environment;
    case 'created_by': return deployment.created_by;
    case 'created_at': return deployment.created_at;
    case 'updated_at': return deployment.updated_at;
    default: return '';
  }
}

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

  // Sort
  result = [...result].sort((a, b) => {
    const aVal = getFieldValue(a, filterState.sort);
    const bVal = getFieldValue(b, filterState.sort);
    const cmp = aVal.localeCompare(bVal);
    return filterState.order === 'asc' ? cmp : -cmp;
  });

  return result;
}

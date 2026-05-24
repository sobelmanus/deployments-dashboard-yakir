import type { ColumnDef } from '@tanstack/react-table';
import type { Deployment, ColumnConfig } from '@/types';
import InlineEditCell from './InlineEditCell';
import RowActions from './RowActions';
import { getFieldValue } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  stopped: 'bg-gray-100 text-gray-700',
};

const ENV_COLORS: Record<string, string> = {
  production: 'bg-purple-100 text-purple-800',
  staging: 'bg-yellow-100 text-yellow-800',
  development: 'bg-blue-100 text-blue-800',
};

export function buildColumns(
  visibleCols: ColumnConfig[],
  hoveredRowId: string | null,
  filterState: { sort: string; order: 'asc' | 'desc' },
  onSort: (field: string) => void,
  onInFlight: (deploymentId: string | null) => void,
): ColumnDef<Deployment>[] {
  const cols: ColumnDef<Deployment>[] = visibleCols.map((colConfig) => {
    const isInlineEdit =
      colConfig.path === 'attributes.name' || colConfig.path === 'attributes.description';

    return {
      id: colConfig.path,
      header: () => (
        <button
          className="flex items-center gap-1 text-left font-semibold text-xs uppercase tracking-wide text-gray-500 hover:text-gray-800"
          onClick={() => onSort(colConfig.path)}
        >
          {colConfig.label}
          <span className="text-gray-400">
            {filterState.sort === colConfig.path
              ? filterState.order === 'asc'
                ? ' ↑'
                : ' ↓'
              : ' ↕'}
          </span>
        </button>
      ),
      cell: ({ row }) => {
        const deployment = row.original;

        if (isInlineEdit) {
          const fieldPath = colConfig.path as 'attributes.name' | 'attributes.description';

          const handleTabNext = fieldPath === 'attributes.name'
            ? () => {
                // Find next row's name cell and simulate click to activate it
                const rows = document.querySelectorAll('[data-row-id]');
                const ids = Array.from(rows).map((r) => r.getAttribute('data-row-id')!);
                const idx = ids.indexOf(deployment.deployment_id);
                if (idx !== -1 && idx < ids.length - 1) {
                  const nextId = ids[idx + 1];
                  const nextRow = document.querySelector(`[data-row-id="${nextId}"]`);
                  const nameCell = nextRow?.querySelector('[data-inline-edit="attributes.name"]') as HTMLElement | null;
                  nameCell?.click();
                }
              }
            : undefined;

          return (
            <InlineEditCell
              deployment={deployment}
              fieldPath={fieldPath}
              onTabNext={handleTabNext}
            />
          );
        }

        const value = getFieldValue(deployment, colConfig.path);

        if (colConfig.path === 'status') {
          return (
            <span
              className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[value] ?? ''}`}
            >
              {value}
            </span>
          );
        }
        if (colConfig.path === 'environment') {
          return (
            <span
              className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${ENV_COLORS[value] ?? ''}`}
            >
              {value}
            </span>
          );
        }
        if (colConfig.path === 'type') {
          return (
            <span className="text-sm text-gray-700">{value.replace(/_/g, ' ')}</span>
          );
        }
        if (colConfig.path === 'created_at' || colConfig.path === 'updated_at') {
          return (
            <span className="text-sm text-gray-600">
              {value ? new Date(value).toLocaleString() : '—'}
            </span>
          );
        }

        return (
          <span className="text-sm text-gray-700 truncate block max-w-xs">
            {value || '—'}
          </span>
        );
      },
      enableSorting: true,
    };
  });

  // Action column
  cols.push({
    id: '__actions',
    header: () => null,
    cell: ({ row }) => {
      const deployment = row.original;
      return (
        <RowActions
          deployment={deployment}
          isHovered={hoveredRowId === deployment.deployment_id}
          onInFlight={(v) => onInFlight(v ? deployment.deployment_id : null)}
        />
      );
    },
    enableSorting: false,
  });

  return cols;
}

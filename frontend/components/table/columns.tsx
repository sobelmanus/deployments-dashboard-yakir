import type { ColumnDef } from '@tanstack/react-table';
import type { Deployment, ColumnConfig } from '@/types';
import InlineEditCell from './InlineEditCell';
import RowActions from './RowActions';
import { getFieldValue } from '@/lib/utils';
import badgeStyles from './Badge.module.css';

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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            textAlign: 'left',
            fontWeight: 600,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          onClick={() => onSort(colConfig.path)}
        >
          {colConfig.label}
          <span style={{ color: 'var(--color-text-muted)' }}>
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
          const statusClass = badgeStyles[value as keyof typeof badgeStyles];
          return (
            <span className={`${badgeStyles.badge}${statusClass ? ` ${statusClass}` : ''}`}>
              {value}
            </span>
          );
        }
        if (colConfig.path === 'environment') {
          const envClass = badgeStyles[value as keyof typeof badgeStyles];
          return (
            <span className={`${badgeStyles.badge}${envClass ? ` ${envClass}` : ''}`}>
              {value}
            </span>
          );
        }
        if (colConfig.path === 'type') {
          return (
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{value.replace(/_/g, ' ')}</span>
          );
        }
        if (colConfig.path === 'created_at' || colConfig.path === 'updated_at') {
          return (
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {value ? new Date(value).toLocaleString() : '—'}
            </span>
          );
        }

        return (
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 320 }}>
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

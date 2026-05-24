'use client';

import { useDeploymentsStore } from '@/store/deployments';
import type { FilterState } from '@/types';
import SearchChips from './SearchChips';
import FilterDropdown from './FilterDropdown';
import ColumnPicker, { useColumnConfig } from './ColumnPicker';
import DeleteToggle from './DeleteToggle';
import styles from './Toolbar.module.css';

// We expose columns via a context so the table can read them
import { createContext, useContext, useMemo } from 'react';
import type { ColumnConfig } from '@/types';

interface ToolbarContextValue {
  columns: ColumnConfig[];
  setColumns: (cols: ColumnConfig[]) => void;
}

export const ToolbarContext = createContext<ToolbarContextValue>({
  columns: [],
  setColumns: () => {},
});

export function useColumns() {
  return useContext(ToolbarContext);
}

export function ToolbarProvider({ children }: { children: React.ReactNode }) {
  const [columns, setColumns] = useColumnConfig();
  const value = useMemo(() => ({ columns, setColumns }), [columns, setColumns]);
  return (
    <ToolbarContext.Provider value={value}>
      {children}
    </ToolbarContext.Provider>
  );
}

export default function Toolbar() {
  const { filterState, setFilterState } = useDeploymentsStore();
  const { columns, setColumns } = useContext(ToolbarContext);

  const update = (partial: Partial<FilterState>) => {
    setFilterState({ ...filterState, ...partial });
  };

  return (
    <div className={styles.toolbar}>
      {/* Top-left: free search */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Search</span>
        <SearchChips
          chips={filterState.chips}
          onChange={(chips) => update({ chips })}
        />
      </div>

      {/* Top-right: delete toggle */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>View</span>
        <DeleteToggle
          value={filterState.view}
          onChange={(view) => update({ view })}
        />
      </div>

      {/* Bottom-left: enum filters */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Filters</span>
        <div className={styles.filtersRow}>
          <FilterDropdown
            label="Status"
            options={['active', 'failed', 'stopped']}
            selected={filterState.status}
            onChange={(status) => update({ status })}
          />
          <FilterDropdown
            label="Type"
            options={['web_service', 'worker', 'cron_job']}
            selected={filterState.type}
            onChange={(type) => update({ type })}
          />
          <FilterDropdown
            label="Environment"
            options={['production', 'staging', 'development']}
            selected={filterState.environment}
            onChange={(environment) => update({ environment })}
          />
        </div>
      </div>

      {/* Bottom-right: column picker */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Columns</span>
        <ColumnPicker columns={columns} onChange={setColumns} />
      </div>
    </div>
  );
}

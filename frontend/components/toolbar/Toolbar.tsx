'use client';

import { useDeploymentsStore } from '@/store/deployments';
import type { FilterState } from '@/types';
import SearchChips from './SearchChips';
import FilterDropdown from './FilterDropdown';
import ColumnPicker, { useColumnConfig } from './ColumnPicker';
import DeleteToggle from './DeleteToggle';
import styles from './Toolbar.module.css';

// We expose columns via a context so the table can read them
import { createContext, useContext } from 'react';
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
  return (
    <ToolbarContext.Provider value={{ columns, setColumns }}>
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
      {/* Left: search chips */}
      <div className={styles.searchArea}>
        <SearchChips
          chips={filterState.chips}
          onChange={(chips) => update({ chips })}
        />
      </div>

      {/* Center: filter dropdowns + column picker */}
      <div className={styles.filtersArea}>
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
        <ColumnPicker columns={columns} onChange={setColumns} />
      </div>

      {/* Right: delete toggle */}
      <div className={styles.rightArea}>
        <DeleteToggle
          value={filterState.view}
          onChange={(view) => update({ view })}
        />
      </div>
    </div>
  );
}

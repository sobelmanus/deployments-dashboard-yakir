'use client';

import { useDeploymentsStore } from '@/store/deployments';
import type { FilterState } from '@/types';
import SearchChips from './SearchChips';
import FilterDropdown from './FilterDropdown';
import ColumnPicker, { useColumnConfig } from './ColumnPicker';
import DeleteToggle from './DeleteToggle';

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
    <div className="flex items-center gap-3 flex-wrap bg-surface border border-border rounded px-3 py-2">
      {/* Left: search chips */}
      <div className="flex-1 min-w-0">
        <SearchChips
          chips={filterState.chips}
          onChange={(chips) => update({ chips })}
        />
      </div>

      {/* Center: filter dropdowns + column picker */}
      <div className="flex items-center gap-2 flex-shrink-0">
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
      <div className="flex-shrink-0">
        <DeleteToggle
          value={filterState.view}
          onChange={(view) => update({ view })}
        />
      </div>
    </div>
  );
}

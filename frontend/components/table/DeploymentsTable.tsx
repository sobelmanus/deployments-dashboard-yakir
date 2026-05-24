'use client';

import { useState, useContext, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useDeploymentsStore } from '@/store/deployments';
import { ToolbarContext } from '@/components/toolbar/Toolbar';
import { buildColumns } from './columns';
import type { Deployment } from '@/types';

interface DeploymentsTableProps {
  loading: boolean;
}

const SKELETON_ROWS = 10;

export default function DeploymentsTable({ loading }: DeploymentsTableProps) {
  const { viewData, filterState, setFilterState, setOpenPanelId } = useDeploymentsStore();
  const { columns: colConfig } = useContext(ToolbarContext);

  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const visibleCols = useMemo(() => colConfig.filter((c) => c.visible), [colConfig]);

  const handleSort = (field: string) => {
    if (filterState.sort === field) {
      setFilterState({ ...filterState, order: filterState.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setFilterState({ ...filterState, sort: field, order: 'asc' });
    }
  };

  const handleRowClick = (id: string) => {
    setOpenPanelId(id);
  };

  const columns = useMemo(
    () => buildColumns(visibleCols, hoveredRowId, filterState, handleSort),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleCols, hoveredRowId, filterState]
  );

  const table = useReactTable({
    data: viewData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
  });

  const isDeletedView = filterState.view === 'deleted';

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Name', 'Description', 'Version', 'Status', 'Type', 'Environment', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div
                      className="h-4 bg-gray-200 rounded animate-pulse"
                      style={{ width: `${60 + ((i * 7 + j) % 3) * 15}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No deployments found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const deployment = row.original as Deployment;
                const isRowDeleted = deployment.deleted_at !== null;
                return (
                  <tr
                    key={row.id}
                    data-row-id={deployment.deployment_id}
                    className={[
                      'border-b border-gray-100 relative cursor-pointer transition-colors',
                      isRowDeleted || isDeletedView ? 'opacity-50' : '',
                      hoveredRowId === deployment.deployment_id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseEnter={() => setHoveredRowId(deployment.deployment_id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    onClick={() => handleRowClick(deployment.deployment_id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2.5"
                        data-inline-edit={
                          cell.column.id === 'attributes.name' ||
                          cell.column.id === 'attributes.description'
                            ? cell.column.id
                            : undefined
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {viewData.length > 0 && (
        <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
          {viewData.length} record{viewData.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

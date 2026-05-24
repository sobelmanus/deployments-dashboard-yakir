'use client';

import { useState, useContext, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
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
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [pageInputValue, setPageInputValue] = useState('1');

  // Reset to first page only when the user actively changes filter/sort state,
  // not on every background delta re-fetch (which produces a new viewData reference)
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setPageInputValue('1');
  }, [filterState]);

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
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination },
    onPaginationChange: setPagination,
    manualSorting: true,
    manualFiltering: true,
  });

  const pageCount = table.getPageCount();
  const currentPage = pagination.pageIndex + 1;

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, pageCount));
    setPagination((prev) => ({ ...prev, pageIndex: clamped - 1 }));
    setPageInputValue(String(clamped));
  };

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
    <div className="h-full flex flex-col bg-white border border-gray-200 rounded overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200">
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

      {/* Pagination footer */}
      <div className="flex items-center px-4 py-2 border-t border-gray-100 text-xs text-gray-600 gap-4">
        {/* Left: page size */}
        <div className="flex items-center gap-2 w-40">
          <span className="text-gray-400 whitespace-nowrap">Rows per page:</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => {
              setPagination({ pageIndex: 0, pageSize: Number(e.target.value) });
              setPageInputValue('1');
            }}
            className="border border-gray-200 rounded px-2 py-1"
          >
            {[20, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        {/* Center: record count */}
        <div className="flex-1 text-center text-gray-400">
          {viewData.length === 0 ? 'No results' : (() => {
            const from = pagination.pageIndex * pagination.pageSize + 1;
            const to = Math.min((pagination.pageIndex + 1) * pagination.pageSize, viewData.length);
            return `Displaying ${from}–${to} of ${viewData.length} results`;
          })()}
        </div>

        {/* Right: page navigation */}
        <div className="flex items-center gap-1 w-40 justify-end">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1}
            className="px-2 py-1 rounded disabled:opacity-30 hover:bg-gray-100" title="First page">{'<<'}</button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
            className="px-2 py-1 rounded disabled:opacity-30 hover:bg-gray-100" title="Previous page">{'<'}</button>
          <span className="flex items-center gap-1 px-1">
            <input
              type="number"
              min={1}
              max={pageCount}
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              onBlur={() => goToPage(Number(pageInputValue))}
              onKeyDown={(e) => e.key === 'Enter' && goToPage(Number(pageInputValue))}
              className="w-12 border border-gray-200 rounded px-1 py-0.5 text-center"
            />
            <span className="text-gray-400 whitespace-nowrap">of {pageCount}</span>
          </span>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pageCount}
            className="px-2 py-1 rounded disabled:opacity-30 hover:bg-gray-100" title="Next page">{'>'}</button>
          <button onClick={() => goToPage(pageCount)} disabled={currentPage === pageCount}
            className="px-2 py-1 rounded disabled:opacity-30 hover:bg-gray-100" title="Last page">{'>>'}</button>
        </div>
      </div>
    </div>
  );
}

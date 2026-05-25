'use client';

import { useState, useContext, useMemo, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { useDeploymentsStore } from '@/store/deployments';
import { ToolbarContext } from '@/components/toolbar/Toolbar';
import { buildColumns } from './columns';
import type { Deployment } from '@/types';
import styles from './DeploymentsTable.module.css';

interface DeploymentsTableProps {
  loading: boolean;
}

const SKELETON_ROWS = 10;

export default function DeploymentsTable({ loading }: DeploymentsTableProps) {
  const { viewData, filterState, setFilterState, setOpenPanelId } = useDeploymentsStore();
  const { columns: colConfig } = useContext(ToolbarContext);

  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [pageInputValue, setPageInputValue] = useState('1');

  // Reset to first page only when the user actively changes filter/sort state,
  // not on every background delta re-fetch (which produces a new viewData reference)
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setPageInputValue('1');
  }, [filterState]);

  const visibleCols = useMemo(() => colConfig.filter((c) => c.visible), [colConfig]);

  const handleSort = useCallback((field: string) => {
    if (filterState.sort === field) {
      setFilterState({ ...filterState, order: filterState.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setFilterState({ ...filterState, sort: field, order: 'asc' });
    }
  }, [filterState, setFilterState]);

  const handleRowClick = (id: string) => {
    setOpenPanelId(id);
  };

  const columns = useMemo(
    () => buildColumns(visibleCols, filterState, handleSort, setDeletingRowId),
    [visibleCols, filterState, handleSort]
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
      <div className={styles.skeletonContainer}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.skeletonHeaderRow}>
              {['Name', 'Description', 'Version', 'Status', 'Type', 'Environment', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    className={styles.skeletonHeaderCell}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <tr key={i} className={styles.skeletonRow}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className={styles.skeletonCell}>
                    <div
                      className={clsx(styles.skeletonBar, 'animate-pulse')}
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
    <div className={styles.container}>
      <div className={styles.scrollArea}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className={styles.headerRow}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={header.id === '__actions' ? styles.stickyActionHeader : styles.headerCell}
                  >
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
                  className={styles.emptyCell}
                >
                  No deployments found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const deployment = row.original as Deployment;
                const isRowDeleted = deployment.deleted_at !== null;
                const isDeleting = deletingRowId === deployment.deployment_id;
                return (
                  <tr
                    key={row.id}
                    data-row-id={deployment.deployment_id}
                    className={clsx(
                      styles.bodyRow,
                      (isRowDeleted || isDeletedView) && styles.rowDimmed,
                      isDeleting && styles.rowDeleting,
                      isDeleting && 'animate-pulse',
                    )}
                    onClick={() => handleRowClick(deployment.deployment_id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cell.column.id === '__actions' ? styles.stickyActionCell : styles.cell}
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
      <div className={styles.footer}>
        {/* Left: page size */}
        <div className={styles.footerLeft}>
          <span className={styles.footerMuted}>Rows per page:</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => {
              setPagination({ pageIndex: 0, pageSize: Number(e.target.value) });
              setPageInputValue('1');
            }}
            className={styles.pageSizeSelect}
          >
            {[20, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        {/* Center: record count */}
        <div className={styles.footerCenter}>
          {viewData.length === 0 ? 'No results' : (() => {
            const from = pagination.pageIndex * pagination.pageSize + 1;
            const to = Math.min((pagination.pageIndex + 1) * pagination.pageSize, viewData.length);
            return `Displaying ${from}–${to} of ${viewData.length} results`;
          })()}
        </div>

        {/* Right: page navigation */}
        <div className={styles.footerRight}>
          <button onClick={() => goToPage(1)} disabled={currentPage === 1}
            className={styles.pageButton} title="First page">{'<<'}</button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
            className={styles.pageButton} title="Previous page">{'<'}</button>
          <span className={styles.pageInputWrapper}>
            <input
              type="number"
              min={1}
              max={pageCount}
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              onBlur={() => goToPage(Number(pageInputValue))}
              onKeyDown={(e) => e.key === 'Enter' && goToPage(Number(pageInputValue))}
              className={styles.pageInput}
            />
            <span className={styles.footerMuted}>of {pageCount}</span>
          </span>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pageCount}
            className={styles.pageButton} title="Next page">{'>'}</button>
          <button onClick={() => goToPage(pageCount)} disabled={currentPage === pageCount}
            className={styles.pageButton} title="Last page">{'>>'}</button>
        </div>
      </div>
    </div>
  );
}

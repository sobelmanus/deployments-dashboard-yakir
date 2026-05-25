'use client';

import { useState, useContext, useMemo, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type PaginationState,
  type Updater,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { useDeploymentsStore } from '@/store/deployments';
import { ToolbarContext } from '@/components/toolbar/Toolbar';
import { buildColumns } from './columns';
import PaginationFooter from './PaginationFooter';
import type { Deployment } from '@/types';
import styles from './DeploymentsTable.module.css';

interface DeploymentsTableProps {
  loading: boolean;
  onPageChange?: (pageIndex: number, pageSize: number) => void;
}

const SKELETON_ROWS = 10;

export default function DeploymentsTable({ loading, onPageChange }: DeploymentsTableProps) {
  const {
    viewData,
    prefetchComplete,
    serverPageItems,
    serverPageCount,
    serverTotal,
    filterState,
    setFilterState,
    setOpenPanelId,
  } = useDeploymentsStore();
  const { columns: colConfig } = useContext(ToolbarContext);

  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  const isServerPaginated = !prefetchComplete && serverPageItems !== null;
  const tableData = isServerPaginated ? serverPageItems! : viewData;
  const displayTotal = isServerPaginated ? serverTotal! : viewData.length;

  // Reset to first page when filter/sort state changes and re-fetch if server-paginated
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    if (isServerPaginated) {
      onPageChange?.(0, pagination.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handlePaginationChange = useCallback((updater: Updater<PaginationState>) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    setPagination(next);
    if (isServerPaginated) {
      onPageChange?.(next.pageIndex, next.pageSize);
    }
  }, [pagination, isServerPaginated, onPageChange]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination },
    onPaginationChange: handlePaginationChange,
    manualPagination: isServerPaginated,
    pageCount: isServerPaginated ? (serverPageCount ?? 1) : undefined,
    autoResetPageIndex: false,
    manualSorting: true,
    manualFiltering: true,
  });

  const pageCount = table.getPageCount();
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

      <PaginationFooter
        total={displayTotal}
        pageCount={pageCount}
        pagination={pagination}
        setPagination={handlePaginationChange}
      />
    </div>
  );
}

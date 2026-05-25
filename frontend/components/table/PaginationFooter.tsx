'use client';

import { useState, useEffect } from 'react';
import styles from './DeploymentsTable.module.css';

interface PaginationFooterProps {
  total: number;
  pageCount: number;
  pagination: { pageIndex: number; pageSize: number };
  setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>;
}

export default function PaginationFooter({ total, pageCount, pagination, setPagination }: PaginationFooterProps) {
  const currentPage = pagination.pageIndex + 1;
  const [pageInputValue, setPageInputValue] = useState(String(currentPage));

  useEffect(() => {
    setPageInputValue(String(pagination.pageIndex + 1));
  }, [pagination.pageIndex]);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, pageCount));
    setPagination((prev) => ({ ...prev, pageIndex: clamped - 1 }));
    setPageInputValue(String(clamped));
  };

  return (
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
        {total === 0 ? 'No results' : (() => {
          const from = pagination.pageIndex * pagination.pageSize + 1;
          const to = Math.min((pagination.pageIndex + 1) * pagination.pageSize, total);
          return `Displaying ${from}–${to} of ${total} results`;
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
  );
}

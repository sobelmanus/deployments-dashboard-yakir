'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useDeploymentsStore } from '@/store/deployments';
import { fetchDeployments, fetchFieldConfig } from '@/lib/api';
import { parseUrlState, pushFilterState } from '@/lib/url-state';
import Toolbar, { ToolbarProvider } from '@/components/toolbar/Toolbar';
import DeploymentsTable from '@/components/table/DeploymentsTable';
import DetailPanel from '@/components/detail-panel/DetailPanel';
import ThemeToggle from '@/components/ThemeToggle';
import type { Deployment, FilterState } from '@/types';
import styles from './page.module.css';

const DELTA_INTERVAL_MS = 15_000;
const FULL_REFETCH_INTERVAL_MS = 5 * 60_000;

export default function Home() {
  const {
    rawData,
    prefetchComplete,
    lastFetchedAt,
    fetchError,
    filterState,
    openPanelId,
    setRawData,
    mergeRawData,
    setFieldConfig,
    setPrefetchComplete,
    setLastFetchedAt,
    setFetchError,
    setFilterState,
    setOpenPanelId,
  } = useDeploymentsStore();

  const prefetchAbortRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);

  // Full prefetch: fetch all pages sequentially
  const runFullPrefetch = useCallback(async (isBackground = false) => {
    if (prefetchAbortRef.current) {
      prefetchAbortRef.current.abort();
    }
    const controller = new AbortController();
    prefetchAbortRef.current = controller;

    if (!isBackground) setPrefetchComplete(false);
    const accumulated: Deployment[] = [];

    try {
      let page = 1;
      let pages = 1;
      do {
        if (controller.signal.aborted) return;
        const res = await fetchDeployments({ page, limit: 100, view: 'all' });
        accumulated.push(...res.items);
        pages = res.pages;
        page++;
      } while (page <= pages);

      if (!controller.signal.aborted) {
        setRawData(accumulated);
        setLastFetchedAt(new Date().toISOString());
        setPrefetchComplete(true);
        setFetchError(null);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setFetchError(err instanceof Error ? err.message : 'Prefetch failed');
      }
    }
  }, [setRawData, setLastFetchedAt, setPrefetchComplete, setFetchError]);

  // Delta re-fetch
  const runDeltaFetch = useCallback(async () => {
    const since = lastFetchedAt;
    if (!since) return;
    try {
      const res = await fetchDeployments({ updated_since: since, limit: 100, view: 'all' });
      if (res.items.length > 0) {
        mergeRawData(res.items);
      }
      setLastFetchedAt(new Date().toISOString());
    } catch {
      // silently ignore delta errors
    }
  }, [lastFetchedAt, mergeRawData, setLastFetchedAt]);


  // Initial setup
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Parse URL state
    const { filterState: urlFilter, openPanelId: urlPanel } = parseUrlState(
      window.location.search
    );
    setFilterState(urlFilter);
    if (urlPanel) setOpenPanelId(urlPanel);

    // Fetch field config
    fetchFieldConfig()
      .then(setFieldConfig)
      .catch((err) => console.error('field-config fetch failed:', err));

    // Bootstrap fetch: page 1 with URL filters applied server-side for fast first paint.
    // Note: search chips are client-side only and cannot be forwarded to the server.
    const doBootstrap = async () => {
      try {
        const res = await fetchDeployments({
          page: 1,
          limit: 100,
          view: urlFilter.view,
          status: urlFilter.status,
          type: urlFilter.type,
          environment: urlFilter.environment,
          sort: urlFilter.sort,
          order: urlFilter.order,
        });
        // Set initial data
        setRawData(res.items);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Bootstrap fetch failed');
      }
    };

    doBootstrap().then(() => {
      // Immediately kick off full prefetch
      runFullPrefetch();
    });
  }, [
    setFilterState,
    setOpenPanelId,
    setFieldConfig,
    setRawData,
    setFetchError,
    runFullPrefetch,
  ]);

  // Delta re-fetch every 15s
  useEffect(() => {
    if (!prefetchComplete) return;
    const id = setInterval(runDeltaFetch, DELTA_INTERVAL_MS);
    return () => clearInterval(id);
  }, [prefetchComplete, runDeltaFetch]);

  // Full re-fetch every 5min
  useEffect(() => {
    if (!prefetchComplete) return;
    const id = setInterval(() => runFullPrefetch(true), FULL_REFETCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [prefetchComplete, runFullPrefetch]);


  // Sync filter/panel changes to URL
  const prevSyncRef = useRef<{ fs: FilterState; panel: string | null } | null>(null);
  useEffect(() => {
    const panel = openPanelId;
    const fs = filterState;
    const prev = prevSyncRef.current;

    if (!prev) {
      prevSyncRef.current = { fs, panel };
      return;
    }

    const panelChanged = prev.panel !== panel;
    // setFilterState always creates a new object, so reference inequality is sufficient
    const fsChanged = prev.fs !== fs;

    if (!panelChanged && !fsChanged) return;

    prevSyncRef.current = { fs, panel };

    // Opening a panel → pushState; everything else → replaceState
    const usePush = panel !== null && prev.panel === null;
    pushFilterState(fs, panel, usePush);
  }, [filterState, openPanelId]);

  const handleClosePanel = useCallback(() => setOpenPanelId(null), [setOpenPanelId]);

  const handleRetry = useCallback(() => {
    setFetchError(null);
    runFullPrefetch();
  }, [setFetchError, runFullPrefetch]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Deployments Dashboard</h1>
        <ThemeToggle />
      </header>

      <main className={styles.main}>
        <ToolbarProvider>
        <Toolbar />

        {!prefetchComplete && (
          <div className={styles.loadingBanner}>
            Loading full dataset for instant filtering…
          </div>
        )}

        {fetchError && (
          <div className={styles.errorBanner}>
            <span className={styles.errorText}>Error: {fetchError}</span>
            <button
              onClick={handleRetry}
              className={styles.errorRetry}
            >
              Retry
            </button>
            <button
              onClick={() => setFetchError(null)}
              className={styles.errorDismiss}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <div className={styles.tableWrapper}>
          <DeploymentsTable loading={rawData.length === 0 && !fetchError} />
        </div>
        </ToolbarProvider>
      </main>

      {openPanelId && (
        <DetailPanel
          deploymentId={openPanelId}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}

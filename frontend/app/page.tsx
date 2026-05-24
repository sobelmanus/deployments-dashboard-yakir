'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useDeploymentsStore } from '@/store/deployments';
import { fetchDeployments, fetchFieldConfig } from '@/lib/api';
import { parseUrlState, pushFilterState } from '@/lib/url-state';
import Toolbar, { ToolbarProvider } from '@/components/toolbar/Toolbar';
import DeploymentsTable from '@/components/table/DeploymentsTable';
import DetailPanel from '@/components/detail-panel/DetailPanel';
import type { Deployment, FilterState } from '@/types';

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
  const serverFetchAbortRef = useRef<AbortController | null>(null);

  // Full prefetch: fetch all pages sequentially
  const runFullPrefetch = useCallback(async () => {
    if (prefetchAbortRef.current) {
      prefetchAbortRef.current.abort();
    }
    const controller = new AbortController();
    prefetchAbortRef.current = controller;

    setPrefetchComplete(false);
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

  // Server fetch for filter changes during prefetch
  const runServerFilterFetch = useCallback(
    async (fs: FilterState) => {
      if (serverFetchAbortRef.current) {
        serverFetchAbortRef.current.abort();
      }
      const controller = new AbortController();
      serverFetchAbortRef.current = controller;

      try {
        const res = await fetchDeployments({
          page: 1,
          limit: 100,
          view: fs.view,
          status: fs.status,
          type: fs.type,
          environment: fs.environment,
          sort: fs.sort,
          order: fs.order,
        });
        if (!controller.signal.aborted) {
          // Only update viewData in-flight without replacing rawData
          // We'll just merge these into rawData as partial data
          mergeRawData(res.items);
        }
      } catch {
        // ignore abort
      }
    },
    [mergeRawData]
  );

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
      .catch(() => {
        // non-fatal
      });

    // Bootstrap fetch: page 1 with URL filters
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
    const id = setInterval(runFullPrefetch, FULL_REFETCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [prefetchComplete, runFullPrefetch]);

  // When filter changes and prefetch is NOT complete: fire server request
  const prevFilterRef = useRef<FilterState | null>(null);
  useEffect(() => {
    if (prefetchComplete) return;
    if (!prevFilterRef.current) {
      prevFilterRef.current = filterState;
      return;
    }
    const prev = prevFilterRef.current;
    // Check if filter actually changed
    if (JSON.stringify(prev) !== JSON.stringify(filterState)) {
      prevFilterRef.current = filterState;
      runServerFilterFetch(filterState);
    }
  }, [filterState, prefetchComplete, runServerFilterFetch]);

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
    const fsChanged = JSON.stringify(prev.fs) !== JSON.stringify(fs);

    if (!panelChanged && !fsChanged) return;

    prevSyncRef.current = { fs, panel };

    // Opening a panel → pushState; everything else → replaceState
    const usePush = panel !== null && prev.panel === null;
    pushFilterState(fs, panel, usePush);
  }, [filterState, openPanelId]);

  const handleRetry = () => {
    setFetchError(null);
    runFullPrefetch();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Deployments Dashboard</h1>
      </header>

      <main className="flex-1 flex flex-col px-6 py-4 gap-3">
        <ToolbarProvider>
        <Toolbar />

        {!prefetchComplete && (
          <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-1.5">
            Loading full dataset for instant filtering…
          </div>
        )}

        {fetchError && (
          <div className="flex items-center gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            <span>Error: {fetchError}</span>
            <button
              onClick={handleRetry}
              className="underline font-medium hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        <div className="flex-1">
          <DeploymentsTable loading={rawData.length === 0 && !fetchError} />
        </div>
        </ToolbarProvider>
      </main>

      {openPanelId && (
        <DetailPanel
          deploymentId={openPanelId}
          onClose={() => setOpenPanelId(null)}
        />
      )}
    </div>
  );
}

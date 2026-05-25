'use client';

import { useState } from 'react';
import { useDeploymentsStore } from '@/store/deployments';
import { deleteDeployment, restoreDeployment } from '@/lib/api';
import type { Deployment } from '@/types';
import DeleteOverlay from './DeleteOverlay';
import styles from './RowActions.module.css';

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const RestoreIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <polyline points="3 3 3 8 8 8" />
  </svg>
);

interface RowActionsProps {
  deployment: Deployment;
  onInFlight: (v: boolean) => void;
}

export default function RowActions({ deployment, onInFlight }: RowActionsProps) {
  const { updateRecord } = useDeploymentsStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeleted = deployment.deleted_at !== null;

  const handleDelete = async () => {
    setShowConfirm(false);
    onInFlight(true);
    setInFlight(true);
    setError(null);
    try {
      const updated = await deleteDeployment(deployment.deployment_id);
      updateRecord(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setInFlight(false);
      onInFlight(false);
    }
  };

  const handleRestore = async () => {
    onInFlight(true);
    setInFlight(true);
    setError(null);
    try {
      const updated = await restoreDeployment(deployment.deployment_id);
      updateRecord(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setInFlight(false);
      onInFlight(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {error && <span className={styles.errorText} title={error}>!</span>}

      {!inFlight && !error && !isDeleted && !showConfirm && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          className={styles.deleteButton}
          title="Delete"
        >
          <TrashIcon />
        </button>
      )}

      {!inFlight && !error && isDeleted && (
        <button
          onClick={(e) => { e.stopPropagation(); handleRestore(); }}
          className={styles.restoreButton}
          title="Restore"
        >
          <RestoreIcon />
        </button>
      )}

      {showConfirm && (
        <DeleteOverlay onConfirm={handleDelete} onCancel={() => setShowConfirm(false)} />
      )}
    </div>
  );
}

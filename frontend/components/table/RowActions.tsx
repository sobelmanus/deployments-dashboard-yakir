'use client';

import { useState } from 'react';
import { useDeploymentsStore } from '@/store/deployments';
import { deleteDeployment, restoreDeployment } from '@/lib/api';
import type { Deployment } from '@/types';
import DeleteOverlay from './DeleteOverlay';
import styles from './RowActions.module.css';

interface RowActionsProps {
  deployment: Deployment;
  isHovered: boolean;
  onInFlight: (v: boolean) => void;
}

export default function RowActions({ deployment, isHovered, onInFlight }: RowActionsProps) {
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
      {error && (
        <span className={styles.errorText}>{error}</span>
      )}
      {inFlight && (
        <span className={`${styles.inFlight} animate-pulse`}>…</span>
      )}
      {!inFlight && !error && isHovered && !isDeleted && !showConfirm && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(true);
          }}
          className={styles.deleteButton}
        >
          Delete
        </button>
      )}
      {!inFlight && !error && isHovered && isDeleted && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRestore();
          }}
          className={styles.restoreButton}
        >
          Restore
        </button>
      )}
      {showConfirm && (
        <DeleteOverlay onConfirm={handleDelete} onCancel={() => setShowConfirm(false)} />
      )}
    </div>
  );
}

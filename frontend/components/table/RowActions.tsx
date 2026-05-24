'use client';

import { useState } from 'react';
import { useDeploymentsStore } from '@/store/deployments';
import { deleteDeployment, restoreDeployment } from '@/lib/api';
import type { Deployment } from '@/types';
import DeleteOverlay from './DeleteOverlay';

interface RowActionsProps {
  deployment: Deployment;
  isHovered: boolean;
}

export default function RowActions({ deployment, isHovered }: RowActionsProps) {
  const { updateRecord } = useDeploymentsStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeleted = deployment.deleted_at !== null;

  const handleDelete = async () => {
    setShowConfirm(false);
    setInFlight(true);
    setError(null);
    try {
      const updated = await deleteDeployment(deployment.deployment_id);
      updateRecord(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setInFlight(false);
    }
  };

  const handleRestore = async () => {
    setInFlight(true);
    setError(null);
    try {
      const updated = await restoreDeployment(deployment.deployment_id);
      updateRecord(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setInFlight(false);
    }
  };

  return (
    <div className="relative flex items-center justify-end gap-2 min-w-[80px]">
      {error && (
        <span className="text-xs text-red-500 mr-1">{error}</span>
      )}
      {inFlight && (
        <span className="text-xs text-gray-400 animate-pulse">…</span>
      )}
      {!inFlight && !error && isHovered && !isDeleted && !showConfirm && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(true);
          }}
          className="px-2 py-0.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
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
          className="px-2 py-0.5 text-xs border border-green-300 text-green-600 rounded hover:bg-green-50"
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

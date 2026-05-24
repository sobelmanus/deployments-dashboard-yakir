'use client';

import { useEffect, useRef } from 'react';
import { useDeploymentsStore } from '@/store/deployments';
import AttributesSection from './AttributesSection';
import type { Deployment } from '@/types';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
  deploymentId: string;
  onClose: () => void;
}

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (key === 'created_at' || key === 'updated_at') {
    return new Date(String(val)).toLocaleString();
  }
  return String(val);
}

const READ_ONLY_FIELDS: Array<{ key: keyof Deployment; label: string }> = [
  { key: 'deployment_id', label: 'Deployment ID' },
  { key: 'version', label: 'Version' },
  { key: 'status', label: 'Status' },
  { key: 'type', label: 'Type' },
  { key: 'environment', label: 'Environment' },
  { key: 'created_by', label: 'Created By' },
  { key: 'created_at', label: 'Created At' },
];

export default function DetailPanel({ deploymentId, onClose }: DetailPanelProps) {
  const rawData = useDeploymentsStore((s) => s.rawData);
  const deployment = rawData.find((d) => d.deployment_id === deploymentId);

  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!deployment) {
    return (
      <div className={styles.root}>
        <div ref={backdropRef} className={styles.backdrop} onClick={handleBackdropClick} />
        <div className={`${styles.panel} ${styles.notFoundPanel} animate-slide-in`}>
          <p className={styles.notFoundText}>Deployment not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={styles.backdrop}
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <div className={`${styles.panel} animate-slide-in`}>
        {/* Header */}
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            {deployment.attributes.name || deployment.deployment_id}
          </h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className={styles.panelBody}>
          <div className={styles.bodyStack}>
            {/* Read-only section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Details
              </h3>
              <dl className={styles.fieldList}>
                {READ_ONLY_FIELDS.map(({ key, label }) => (
                  <div key={key} className={styles.fieldRow}>
                    <dt className={styles.fieldLabel}>{label}</dt>
                    <dd className={styles.fieldValue}>
                      {formatValue(key, deployment[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Attributes section */}
            <AttributesSection deployment={deployment} />
          </div>
        </div>
      </div>
    </div>
  );
}

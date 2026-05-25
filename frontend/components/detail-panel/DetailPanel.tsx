'use client';

import { useEffect, useRef } from 'react';
import { useDeploymentsStore } from '@/store/deployments';
import AttributesSection from './AttributesSection';
import DetailPanelHeader from './DetailPanelHeader';
import ReadOnlyFields from './ReadOnlyFields';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
  deploymentId: string;
  onClose: () => void;
}

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
        <DetailPanelHeader
          name={deployment.attributes.name || deployment.deployment_id}
          onClose={onClose}
        />

        {/* Body */}
        <div className={styles.panelBody}>
          <div className={styles.bodyStack}>
            {/* Read-only section */}
            <ReadOnlyFields deployment={deployment} />

            {/* Attributes section */}
            <AttributesSection deployment={deployment} />
          </div>
        </div>
      </div>
    </div>
  );
}

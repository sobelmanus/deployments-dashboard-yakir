'use client';

import { useEffect, useRef } from 'react';
import { useDeploymentsStore } from '@/store/deployments';
import AttributesSection from './AttributesSection';
import type { Deployment } from '@/types';

interface DetailPanelProps {
  deploymentId: string;
  onClose: () => void;
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
      <div className="fixed inset-0 z-40 flex items-end justify-end">
        <div ref={backdropRef} className="absolute inset-0 bg-black/30" onClick={handleBackdropClick} />
        <div className="relative w-[480px] h-full bg-white border-l border-gray-200 shadow-2xl flex items-center justify-center">
          <p className="text-gray-400">Deployment not found</p>
        </div>
      </div>
    );
  }

  const formatValue = (key: string, val: unknown): string => {
    if (val === null || val === undefined) return '—';
    if (key === 'created_at' || key === 'updated_at') {
      return new Date(String(val)).toLocaleString();
    }
    return String(val);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-end">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/30"
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <div className="relative w-[480px] max-w-full h-full bg-white border-l border-gray-200 shadow-2xl flex flex-col overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {deployment.attributes.name || deployment.deployment_id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2 flex-shrink-0"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Read-only section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Details
            </h3>
            <dl className="space-y-2">
              {READ_ONLY_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex gap-3">
                  <dt className="w-32 flex-shrink-0 text-xs text-gray-500">{label}</dt>
                  <dd className="text-sm text-gray-900 break-all">
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
  );
}

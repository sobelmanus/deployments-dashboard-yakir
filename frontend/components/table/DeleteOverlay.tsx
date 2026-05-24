'use client';

import { useEffect, useRef } from 'react';

interface DeleteOverlayProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteOverlay({ onConfirm, onCancel }: DeleteOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    // Small delay to avoid the mousedown that opened this
    const id = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [onCancel]);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      {/* semi-transparent backdrop over the row */}
      <div className="absolute inset-0 bg-surface/80 rounded" />
      <div
        ref={overlayRef}
        className="relative z-10 flex items-center gap-3 px-4 py-2 bg-surface border border-border rounded shadow-md dark:shadow-black/40 text-sm"
      >
        <span className="text-text-primary">Delete this deployment?</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfirm();
          }}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
        >
          Confirm
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="px-3 py-1 border border-border rounded hover:bg-surface-hover text-text-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

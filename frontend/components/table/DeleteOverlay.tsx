'use client';

import { useEffect, useRef } from 'react';
import styles from './DeleteOverlay.module.css';

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
    <div className={styles.overlay}>
      {/* semi-transparent backdrop over the row */}
      <div className={styles.backdrop} />
      <div
        ref={overlayRef}
        className={styles.dialog}
      >
        <span className={styles.question}>Delete this deployment?</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfirm();
          }}
          className={styles.confirmButton}
        >
          Confirm
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className={styles.cancelButton}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

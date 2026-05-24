'use client';

import { useEffect, useRef } from 'react';
import styles from './DeleteOverlay.module.css';

interface DeleteOverlayProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteOverlay({ onConfirm, onCancel }: DeleteOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
  }, [onCancel]);

  return (
    <div ref={dialogRef} className={styles.dialog}>
      <span className={styles.question}>Delete?</span>
      <button
        onClick={(e) => { e.stopPropagation(); onConfirm(); }}
        className={styles.confirmButton}
      >
        Confirm
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        className={styles.cancelButton}
      >
        Cancel
      </button>
    </div>
  );
}

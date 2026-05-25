'use client';

import { useEffect, useRef } from 'react';
import styles from './Toast.module.css';

const AUTO_DISMISS_MS = 15_000;

interface ToastProps {
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}

export default function Toast({ message, onClose, onRetry }: ToastProps) {
  // Keep a ref so the timeout always calls the latest onClose without resetting the timer
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Reset the 15s timer whenever the message changes (new error arrived)
  useEffect(() => {
    const id = setTimeout(() => onCloseRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [message]);

  return (
    <div className={styles.toast} role="alert">
      <span className={styles.message}>Error: {message}</span>
      {onRetry && (
        <button onClick={onRetry} className={styles.retry}>
          Retry
        </button>
      )}
      <button onClick={onClose} className={styles.close} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

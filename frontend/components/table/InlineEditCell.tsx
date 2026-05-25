'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useDeploymentsStore } from '@/store/deployments';
import { patchDeployment } from '@/lib/api';
import type { Deployment } from '@/types';
import styles from './InlineEditCell.module.css';

interface InlineEditCellProps {
  deployment: Deployment;
  fieldPath: 'attributes.name' | 'attributes.description';
  onTabNext?: () => void;
}

export default function InlineEditCell({
  deployment,
  fieldPath,
  onTabNext,
}: InlineEditCellProps) {
  const { updateRecord, registerEdit, unregisterEdit, incrementPending, decrementPending } = useDeploymentsStore();

  const attrKey = fieldPath.slice('attributes.'.length);
  const currentValue = deployment.attributes[attrKey] ?? '';

  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentValue);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const originalValueRef = useRef(currentValue);
  // Use ref for the commit function to avoid stale-closure issues with blur
  const commitRef = useRef<() => Promise<void>>();
  // Guards against double-commit: Enter/Tab fires commit(), which causes blur, which fires commitRef again
  const committedRef = useRef(false);

  // Keep original value in sync when not editing
  useEffect(() => {
    if (!editing) {
      setInputValue(currentValue);
      originalValueRef.current = currentValue;
    }
  }, [currentValue, editing]);

  const activate = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent row click from opening panel
    committedRef.current = false;
    setEditing(true);
    setInputValue(currentValue);
    originalValueRef.current = currentValue;
    registerEdit(`${deployment.deployment_id}:${fieldPath}`);
  };

  const commit = useCallback(async () => {
    if (!editing || committedRef.current) return;
    committedRef.current = true;
    setEditing(false);
    unregisterEdit(`${deployment.deployment_id}:${fieldPath}`);

    const trimmed = inputValue.trim();
    if (trimmed === originalValueRef.current) {
      setStatus('idle');
      return;
    }

    // Optimistic update
    const optimistic: Deployment = {
      ...deployment,
      attributes: { ...deployment.attributes, [attrKey]: trimmed },
    };
    updateRecord(optimistic);
    setStatus('saving');
    incrementPending();

    try {
      const updated = await patchDeployment(deployment.deployment_id, {
        [fieldPath]: trimmed,
      });
      updateRecord(updated);
      setStatus('idle');
    } catch {
      // Revert
      updateRecord(deployment);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 1200);
    } finally {
      decrementPending();
    }
  }, [
    editing,
    inputValue,
    deployment,
    fieldPath,
    attrKey,
    updateRecord,
    unregisterEdit,
    incrementPending,
    decrementPending,
  ]);

  // Keep commitRef in sync
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const cancel = useCallback(() => {
    setEditing(false);
    setInputValue(originalValueRef.current);
    setStatus('idle');
    unregisterEdit(`${deployment.deployment_id}:${fieldPath}`);
  }, [deployment.deployment_id, fieldPath, unregisterEdit]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commit().then(() => {
        onTabNext?.();
      });
    }
  };

  const handleBlur = () => {
    // Use ref to avoid stale closure
    commitRef.current?.();
  };

  const isError = status === 'error';

  const cellClass = clsx(
    styles.cell,
    isError && styles.error,
    isError && 'animate-pulse',
  );

  if (editing) {
    return (
      <div className={cellClass} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={styles.editInput}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(cellClass, styles.viewCell)}
      onClick={activate}
      title={currentValue || undefined}
    >
      {currentValue || <span className={styles.emptyValue}>—</span>}
    </div>
  );
}

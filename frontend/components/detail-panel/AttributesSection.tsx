'use client';

import { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { putDeployment } from '@/lib/api';
import { useDeploymentsStore } from '@/store/deployments';
import type { Deployment } from '@/types';
import styles from './AttributesSection.module.css';

interface AttributeRow {
  key: string;
  value: string;
  markedForDeletion: boolean;
  isNew: boolean;
}

// System attributes: shown first, name/description editable, region read-only
const SYSTEM_ATTR_KEYS = ['name', 'description', 'region'];

interface AttributesSectionProps {
  deployment: Deployment;
}

export default function AttributesSection({ deployment }: AttributesSectionProps) {
  const { updateRecord } = useDeploymentsStore();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<AttributeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyErrors, setKeyErrors] = useState<Set<number>>(new Set());
  const newRowRef = useRef<HTMLInputElement | null>(null);

  const initRows = useCallback((): AttributeRow[] => {
    const attrs = deployment.attributes;
    const systemRows: AttributeRow[] = SYSTEM_ATTR_KEYS.filter((k) => k in attrs).map((k) => ({
      key: k,
      value: attrs[k],
      markedForDeletion: false,
      isNew: false,
    }));
    const customRows: AttributeRow[] = Object.entries(attrs)
      .filter(([k]) => !SYSTEM_ATTR_KEYS.includes(k))
      .map(([k, v]) => ({
        key: k,
        value: v,
        markedForDeletion: false,
        isNew: false,
      }));
    return [...systemRows, ...customRows];
  }, [deployment]);

  const handleEdit = () => {
    setRows(initRows());
    setError(null);
    setKeyErrors(new Set());
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    // Validate: no blank keys
    const errors = new Set<number>();
    rows.forEach((r, idx) => {
      if (!r.markedForDeletion && r.key.trim() === '') {
        errors.add(idx);
      }
    });
    if (errors.size > 0) {
      setKeyErrors(errors);
      return;
    }
    setKeyErrors(new Set());

    const attributes: Record<string, string> = {};
    for (const r of rows) {
      if (!r.markedForDeletion && r.key.trim() !== '') {
        attributes[r.key.trim()] = r.value;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await putDeployment(deployment.deployment_id, attributes);
      updateRecord(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addRow = () => {
    setRows((prev) => [...prev, { key: '', value: '', markedForDeletion: false, isNew: true }]);
    // Focus the new row's key input after render
    setTimeout(() => newRowRef.current?.focus(), 0);
  };

  const updateRow = (idx: number, updates: Partial<AttributeRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...updates } : r)));
  };

  const toggleDelete = (idx: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, markedForDeletion: !r.markedForDeletion } : r))
    );
  };

  const attrs = deployment.attributes;

  if (!editing) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            Attributes
          </h3>
          <button
            onClick={handleEdit}
            className={styles.editButton}
          >
            Edit
          </button>
        </div>
        <dl className={styles.fieldList}>
          {SYSTEM_ATTR_KEYS.filter((k) => k in attrs).map((k) => (
            <div key={k} className={styles.fieldRow}>
              <dt className={styles.fieldLabel}>{k}</dt>
              <dd className={styles.fieldValue}>{attrs[k] || '—'}</dd>
            </div>
          ))}
          {Object.entries(attrs)
            .filter(([k]) => !SYSTEM_ATTR_KEYS.includes(k))
            .map(([k, v]) => (
              <div key={k} className={styles.fieldRow}>
                <dt className={styles.fieldLabel}>{k}</dt>
                <dd className={styles.fieldValue}>{v || '—'}</dd>
              </div>
            ))}
        </dl>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          Attributes
        </h3>
        <div className={styles.actionButtons}>
          <button
            onClick={handleCancel}
            disabled={saving}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={styles.saveButton}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}

      <div className={styles.rowList}>
        {rows.map((row, idx) => {
          const rowKey = row.isNew ? `__new__${idx}` : row.key;
          const isSystemKey = SYSTEM_ATTR_KEYS.includes(row.key) && !row.isNew;
          const isRegion = row.key === 'region';

          return (
            <div
              key={rowKey}
              className={clsx(styles.editRow, row.markedForDeletion && styles.editRowDimmed)}
            >
              {/* Key */}
              {isSystemKey ? (
                <span className={styles.systemKeyLabel}>{row.key}</span>
              ) : (
                <div className={styles.keyInputWrapper}>
                  <input
                    ref={row.isNew && idx === rows.length - 1 ? newRowRef : undefined}
                    type="text"
                    value={row.key}
                    onChange={(e) => updateRow(idx, { key: e.target.value })}
                    disabled={row.markedForDeletion}
                    className={clsx(styles.keyInput, keyErrors.has(idx) && styles.keyInputError)}
                    placeholder="key"
                  />
                  {keyErrors.has(idx) && (
                    <span className={styles.keyRequiredError}>Required</span>
                  )}
                </div>
              )}

              {/* Value */}
              {isRegion ? (
                <span className={styles.readOnlyValue}>{row.value || '—'}</span>
              ) : (
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateRow(idx, { value: e.target.value })}
                  disabled={row.markedForDeletion}
                  className={styles.valueInput}
                  placeholder="value"
                />
              )}

              {/* Delete marker — not shown for system-only keys that shouldn't be removed */}
              {!isRegion && (
                <button
                  onClick={() => toggleDelete(idx)}
                  title={row.markedForDeletion ? 'Undo' : 'Mark for deletion'}
                  className={styles.deleteMarker}
                >
                  {row.markedForDeletion ? '↩' : '×'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addRow}
        className={styles.addRowButton}
      >
        + Add row
      </button>
    </div>
  );
}

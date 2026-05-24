'use client';

import { useState, useRef, useEffect } from 'react';
import { putDeployment } from '@/lib/api';
import { useDeploymentsStore } from '@/store/deployments';
import type { Deployment } from '@/types';

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

  const initRows = () => {
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
  };

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
    setTimeout(() => newRowRef.current?.focus(), 50);
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
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Attributes
          </h3>
          <button
            onClick={handleEdit}
            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
          >
            Edit
          </button>
        </div>
        <dl className="space-y-2">
          {SYSTEM_ATTR_KEYS.filter((k) => k in attrs).map((k) => (
            <div key={k} className="flex gap-3">
              <dt className="w-28 flex-shrink-0 text-xs text-gray-500 capitalize">{k}</dt>
              <dd className="text-sm text-gray-900 break-all">{attrs[k] || '—'}</dd>
            </div>
          ))}
          {Object.entries(attrs)
            .filter(([k]) => !SYSTEM_ATTR_KEYS.includes(k))
            .map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="w-28 flex-shrink-0 text-xs text-gray-500">{k}</dt>
                <dd className="text-sm text-gray-900 break-all">{v || '—'}</dd>
              </div>
            ))}
        </dl>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Attributes
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row, idx) => {
          const isSystemKey = SYSTEM_ATTR_KEYS.includes(row.key) && !row.isNew;
          const isRegion = row.key === 'region';
          const isNameOrDesc = row.key === 'name' || row.key === 'description';

          return (
            <div
              key={idx}
              className={`flex items-center gap-2 ${row.markedForDeletion ? 'opacity-50' : ''}`}
            >
              {/* Key */}
              {isSystemKey ? (
                <span className="w-28 flex-shrink-0 text-xs text-gray-500 capitalize">{row.key}</span>
              ) : (
                <div className="w-28 flex-shrink-0">
                  <input
                    ref={row.isNew && idx === rows.length - 1 ? newRowRef : undefined}
                    type="text"
                    value={row.key}
                    onChange={(e) => updateRow(idx, { key: e.target.value })}
                    disabled={row.markedForDeletion}
                    className={`w-full text-xs border rounded px-2 py-1 outline-none ${
                      keyErrors.has(idx) ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    } disabled:bg-gray-50 disabled:text-gray-400`}
                    placeholder="key"
                  />
                  {keyErrors.has(idx) && (
                    <span className="text-xs text-red-500">Required</span>
                  )}
                </div>
              )}

              {/* Value */}
              {isRegion ? (
                <span className="flex-1 text-sm text-gray-700">{row.value || '—'}</span>
              ) : (
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateRow(idx, { value: e.target.value })}
                  disabled={row.markedForDeletion}
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="value"
                />
              )}

              {/* Delete marker — not shown for system-only keys that shouldn't be removed */}
              {!isRegion && (
                <button
                  onClick={() => toggleDelete(idx)}
                  title={row.markedForDeletion ? 'Undo' : 'Mark for deletion'}
                  className="text-gray-400 hover:text-red-500 text-sm leading-none"
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
        className="mt-3 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        + Add row
      </button>
    </div>
  );
}

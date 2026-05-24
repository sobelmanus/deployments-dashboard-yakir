'use client';

import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useDeploymentsStore } from '@/store/deployments';
import styles from './SearchChips.module.css';

interface Chip {
  field: string;
  value: string;
}

interface SearchChipsProps {
  chips: Chip[];
  onChange: (chips: Chip[]) => void;
}

export default function SearchChips({ chips, onChange }: SearchChipsProps) {
  const fieldConfig = useDeploymentsStore((s) => s.fieldConfig);

  const fieldOptions = [
    { path: 'all', label: 'All' },
    ...(fieldConfig?.system ?? []),
    ...(fieldConfig?.custom ?? []),
  ];

  const addChip = () => {
    onChange([...chips, { field: 'all', value: '' }]);
  };

  const updateChip = (idx: number, updates: Partial<Chip>) => {
    const next = chips.map((c, i) => (i === idx ? { ...c, ...updates } : c));
    onChange(next);
  };

  const removeChip = (idx: number) => {
    onChange(chips.filter((_, i) => i !== idx));
  };

  return (
    <div className={styles.container}>
      {chips.map((chip, idx) => (
        <ChipRow
          key={idx}
          chip={chip}
          fieldOptions={fieldOptions}
          onChange={(updates) => updateChip(idx, updates)}
          onRemove={() => removeChip(idx)}
        />
      ))}
      <button
        onClick={addChip}
        className={styles.addButton}
      >
        + Search
      </button>
    </div>
  );
}

interface ChipRowProps {
  chip: { field: string; value: string };
  fieldOptions: Array<{ path: string; label: string }>;
  onChange: (updates: Partial<{ field: string; value: string }>) => void;
  onRemove: () => void;
}

function ChipRow({ chip, fieldOptions, onChange, onRemove }: ChipRowProps) {
  const [fieldOpen, setFieldOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setFieldOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabel =
    fieldOptions.find((f) => f.path === chip.field)?.label ?? chip.field;

  return (
    <div className={styles.chip}>
      {/* Field dropdown */}
      <div ref={dropRef} className={styles.fieldWrapper}>
        <button
          onClick={() => setFieldOpen((o) => !o)}
          className={styles.fieldButton}
        >
          {selectedLabel} ▾
        </button>
        {fieldOpen && (
          <div className={styles.dropdown}>
            {fieldOptions.map((opt) => (
              <button
                key={opt.path}
                onClick={() => {
                  onChange({ field: opt.path });
                  setFieldOpen(false);
                }}
                className={clsx(
                  styles.dropdownOption,
                  chip.field === opt.path && styles.dropdownOptionSelected
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Value input */}
      <input
        ref={inputRef}
        type="text"
        value={chip.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder="value…"
        className={styles.valueInput}
      />

      {/* Remove */}
      <button
        onClick={onRemove}
        className={styles.removeButton}
      >
        ×
      </button>
    </div>
  );
}

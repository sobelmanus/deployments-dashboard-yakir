'use client';

import { useState, useRef, useEffect } from 'react';
import { useDeploymentsStore } from '@/store/deployments';

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
    <div className="flex flex-wrap items-center gap-2">
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
        className="px-2 py-1 text-sm border border-dashed border-border rounded text-text-secondary hover:border-border hover:text-text-primary"
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
    <div className="flex items-center border border-border rounded bg-surface text-sm">
      {/* Field dropdown */}
      <div ref={dropRef} className="relative">
        <button
          onClick={() => setFieldOpen((o) => !o)}
          className="px-2 py-1 border-r border-border-light text-text-secondary hover:bg-surface-hover whitespace-nowrap"
        >
          {selectedLabel} ▾
        </button>
        {fieldOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-surface-raised border border-border rounded shadow-lg dark:shadow-black/40 z-30 max-h-60 overflow-y-auto">
            {fieldOptions.map((opt) => (
              <button
                key={opt.path}
                onClick={() => {
                  onChange({ field: opt.path });
                  setFieldOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-surface-hover ${
                  chip.field === opt.path ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : ''
                }`}
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
        className="px-2 py-1 outline-none text-text-primary bg-transparent w-32"
      />

      {/* Remove */}
      <button
        onClick={onRemove}
        className="px-2 py-1 text-text-muted hover:text-red-500"
      >
        ×
      </button>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';

interface FilterDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export default function FilterDropdown({
  label,
  options,
  selected,
  onChange,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const displayLabel = selected.length > 0 ? `${label} (${selected.length})` : `${label} ▾`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`px-3 py-1.5 text-sm border rounded flex items-center gap-1 ${
          selected.length > 0
            ? 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
            : 'border-border text-text-secondary bg-surface hover:bg-surface-hover'
        }`}
      >
        {displayLabel}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-surface-raised border border-border rounded shadow-lg dark:shadow-black/40 z-20">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-hover cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-blue-600"
              />
              <span className="capitalize">{opt.replace(/_/g, ' ')}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <div className="border-t border-border-light px-3 py-2">
              <button
                onClick={() => onChange([])}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

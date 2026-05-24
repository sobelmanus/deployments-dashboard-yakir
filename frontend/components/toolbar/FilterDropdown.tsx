'use client';

import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import styles from './FilterDropdown.module.css';

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
    <div ref={ref} className={styles.wrapper}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(styles.trigger, selected.length > 0 && styles.triggerActive)}
      >
        {displayLabel}
      </button>
      {open && (
        <div className={styles.dropdown}>
          {options.map((opt) => (
            <label
              key={opt}
              className={styles.option}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className={styles.checkbox}
              />
              <span className="capitalize">{opt.replace(/_/g, ' ')}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <div className={styles.clearRow}>
              <button
                onClick={() => onChange([])}
                className={styles.clearButton}
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

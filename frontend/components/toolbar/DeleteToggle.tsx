'use client';

import clsx from 'clsx';
import styles from './DeleteToggle.module.css';

interface DeleteToggleProps {
  value: 'existing' | 'deleted' | 'all';
  onChange: (v: 'existing' | 'deleted' | 'all') => void;
}

const OPTIONS: Array<{ value: 'existing' | 'deleted' | 'all'; label: string }> = [
  { value: 'existing', label: 'Existing' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'all', label: 'All' },
];

export default function DeleteToggle({ value, onChange }: DeleteToggleProps) {
  return (
    <div className={styles.group}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(styles.option, value === opt.value && styles.optionActive)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

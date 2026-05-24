'use client';

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
    <div className="flex border border-border rounded overflow-hidden text-sm">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 ${
            value === opt.value
              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
              : 'bg-surface text-text-secondary hover:bg-surface-hover'
          } ${opt.value !== 'existing' ? 'border-l border-border' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

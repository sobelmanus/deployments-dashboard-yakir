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
    <div className="flex border border-gray-300 rounded overflow-hidden text-sm">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 ${
            value === opt.value
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          } ${opt.value !== 'existing' ? 'border-l border-gray-300' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDeploymentsStore } from '@/store/deployments';
import type { ColumnConfig } from '@/types';

const STORAGE_KEY = 'dashboard_columns';

const DEFAULT_VISIBLE = ['attributes.name', 'attributes.description', 'version', 'status', 'type', 'environment'];

const SYSTEM_FIELDS: ColumnConfig[] = [
  { path: 'attributes.name', label: 'Name', visible: true, section: 'system' },
  { path: 'attributes.description', label: 'Description', visible: true, section: 'system' },
  { path: 'version', label: 'Version', visible: true, section: 'system' },
  { path: 'status', label: 'Status', visible: true, section: 'system' },
  { path: 'type', label: 'Type', visible: true, section: 'system' },
  { path: 'environment', label: 'Environment', visible: true, section: 'system' },
  { path: 'deployment_id', label: 'Deployment ID', visible: false, section: 'system' },
  { path: 'created_by', label: 'Created By', visible: false, section: 'system' },
  { path: 'created_at', label: 'Created At', visible: false, section: 'system' },
  { path: 'updated_at', label: 'Updated At', visible: false, section: 'system' },
  { path: 'attributes.team', label: 'Team', visible: false, section: 'system' },
  { path: 'attributes.region', label: 'Region', visible: false, section: 'system' },
];

function buildDefaults(customPaths: string[]): ColumnConfig[] {
  const system = SYSTEM_FIELDS.map((c) => ({
    ...c,
    visible: DEFAULT_VISIBLE.includes(c.path),
  }));
  const custom: ColumnConfig[] = customPaths.map((p) => {
    const key = p.startsWith('attributes.') ? p.slice('attributes.'.length) : p;
    const label = key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return { path: p, label, visible: false, section: 'custom' };
  });
  return [...system, ...custom];
}

function loadFromStorage(customPaths: string[]): ColumnConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaults(customPaths);
    const saved: ColumnConfig[] = JSON.parse(raw);

    // Merge saved with any new custom columns not yet in storage
    const savedPaths = new Set(saved.map((c) => c.path));
    const newCustom: ColumnConfig[] = customPaths
      .filter((p) => !savedPaths.has(p))
      .map((p) => {
        const key = p.startsWith('attributes.') ? p.slice('attributes.'.length) : p;
        const label = key
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return { path: p, label, visible: false, section: 'custom' as const };
      });

    return [...saved, ...newCustom];
  } catch {
    return buildDefaults(customPaths);
  }
}

function saveToStorage(cols: ColumnConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}

interface ColumnPickerProps {
  columns: ColumnConfig[];
  onChange: (cols: ColumnConfig[]) => void;
}

export function useColumnConfig(): [ColumnConfig[], (cols: ColumnConfig[]) => void] {
  const fieldConfig = useDeploymentsStore((s) => s.fieldConfig);
  const [columns, setColumnsState] = useState<ColumnConfig[]>([]);

  useEffect(() => {
    const customPaths = (fieldConfig?.custom ?? []).map((f) => f.path);
    const loaded = loadFromStorage(customPaths);
    setColumnsState(loaded);
  }, [fieldConfig]);

  const setColumns = useCallback((cols: ColumnConfig[]) => {
    setColumnsState(cols);
    saveToStorage(cols);
  }, []);

  return [columns, setColumns];
}

export default function ColumnPicker({ columns, onChange }: ColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const systemCols = columns.filter((c) => c.section === 'system');
  const customCols = columns.filter((c) => c.section === 'custom');

  const toggleVisible = (path: string) => {
    onChange(columns.map((c) => (c.path === path ? { ...c, visible: !c.visible } : c)));
  };

  const handleDragEnd = (event: DragEndEvent, section: 'system' | 'custom') => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sectionCols = section === 'system' ? systemCols : customCols;
    const otherCols = section === 'system' ? customCols : systemCols;

    const oldIdx = sectionCols.findIndex((c) => c.path === active.id);
    const newIdx = sectionCols.findIndex((c) => c.path === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(sectionCols, oldIdx, newIdx);
    const next =
      section === 'system' ? [...reordered, ...otherCols] : [...otherCols, ...reordered];
    onChange(next);
  };

  const resetToDefaults = () => {
    const fieldConfig = columns.filter((c) => c.section === 'custom').map((c) => c.path);
    const defaults = buildDefaults(fieldConfig);
    onChange(defaults);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50"
      >
        Columns ▾
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded shadow-lg z-20">
          <Section
            title="System Columns"
            cols={systemCols}
            onToggle={toggleVisible}
            onDragEnd={(e) => handleDragEnd(e, 'system')}
            sensors={sensors}
          />
          {customCols.length > 0 && (
            <Section
              title="Custom Columns"
              cols={customCols}
              onToggle={toggleVisible}
              onDragEnd={(e) => handleDragEnd(e, 'custom')}
              sensors={sensors}
            />
          )}
          <div className="border-t border-gray-100 px-3 py-2">
            <button
              onClick={resetToDefaults}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  cols: ColumnConfig[];
  onToggle: (path: string) => void;
  onDragEnd: (e: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

function Section({ title, cols, onToggle, onDragEnd, sensors }: SectionProps) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {title}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={cols.map((c) => c.path)} strategy={verticalListSortingStrategy}>
          {cols.map((col) => (
            <SortableColumnRow key={col.path} col={col} onToggle={onToggle} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableColumnRow({
  col,
  onToggle,
}: {
  col: ColumnConfig;
  onToggle: (path: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.path });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
    >
      <span
        {...attributes}
        {...listeners}
        className="text-gray-300 cursor-grab hover:text-gray-500 select-none"
        title="Drag to reorder"
      >
        ⠿
      </span>
      <label className="flex items-center gap-2 cursor-pointer flex-1 text-sm">
        <input
          type="checkbox"
          checked={col.visible}
          onChange={() => onToggle(col.path)}
          className="accent-blue-600"
        />
        {col.label}
      </label>
    </div>
  );
}

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
import styles from './ColumnPicker.module.css';

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
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return buildDefaults(customPaths);
    const saved = parsed as ColumnConfig[];

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
  const initializedRef = useRef(false);

  useEffect(() => {
    // Initialise exactly once, but wait until fieldConfig is loaded so
    // custom attribute columns are included in the first (and only) init.
    if (initializedRef.current || !fieldConfig) return;
    initializedRef.current = true;
    const customPaths = fieldConfig.custom.map((f) => f.path);
    setColumnsState(loadFromStorage(customPaths));
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
    <div ref={ref} className={styles.wrapper}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={styles.trigger}
      >
        Columns ▾
      </button>
      {open && (
        <div className={styles.dropdown}>
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
          <div className={styles.footerRow}>
            <button
              onClick={resetToDefaults}
              className={styles.resetButton}
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
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
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
      className={styles.row}
    >
      <span
        {...attributes}
        {...listeners}
        className={styles.dragHandle}
        title="Drag to reorder"
      >
        ⠿
      </span>
      <label className={styles.rowLabel}>
        <input
          type="checkbox"
          checked={col.visible}
          onChange={() => onToggle(col.path)}
          className={styles.checkbox}
        />
        {col.label}
      </label>
    </div>
  );
}

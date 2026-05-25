import type { RefObject } from 'react';
import clsx from 'clsx';
import styles from './AttributesSection.module.css';

export interface AttributeRow {
  key: string;
  value: string;
  markedForDeletion: boolean;
  isNew: boolean;
}

export const SYSTEM_ATTR_KEYS = ['name', 'description', 'region'];

interface EditableAttributeRowProps {
  row: AttributeRow;
  index: number;
  keyError: boolean;
  newKeyInputRef?: RefObject<HTMLInputElement>;
  onUpdate: (idx: number, updates: Partial<AttributeRow>) => void;
  onToggleDelete: (idx: number) => void;
}

export default function EditableAttributeRow({
  row,
  index,
  keyError,
  newKeyInputRef,
  onUpdate,
  onToggleDelete,
}: EditableAttributeRowProps) {
  const isSystemKey = SYSTEM_ATTR_KEYS.includes(row.key) && !row.isNew;
  const isRegion = row.key === 'region';

  return (
    <div className={clsx(styles.editRow, row.markedForDeletion && styles.editRowDimmed)}>
      {/* Key */}
      {isSystemKey ? (
        <span className={styles.systemKeyLabel}>{row.key}</span>
      ) : (
        <div className={styles.keyInputWrapper}>
          <input
            ref={newKeyInputRef}
            type="text"
            value={row.key}
            onChange={(e) => onUpdate(index, { key: e.target.value })}
            disabled={row.markedForDeletion}
            className={clsx(styles.keyInput, keyError && styles.keyInputError)}
            placeholder="key"
          />
          {keyError && <span className={styles.keyRequiredError}>Required</span>}
        </div>
      )}

      {/* Value */}
      {isRegion ? (
        <span className={styles.readOnlyValue}>{row.value || '—'}</span>
      ) : (
        <input
          type="text"
          value={row.value}
          onChange={(e) => onUpdate(index, { value: e.target.value })}
          disabled={row.markedForDeletion}
          className={styles.valueInput}
          placeholder="value"
        />
      )}

      {/* Delete marker — not shown for system-only keys that shouldn't be removed */}
      {!isRegion && (
        <button
          onClick={() => onToggleDelete(index)}
          title={row.markedForDeletion ? 'Undo' : 'Mark for deletion'}
          className={styles.deleteMarker}
        >
          {row.markedForDeletion ? '↩' : '×'}
        </button>
      )}
    </div>
  );
}

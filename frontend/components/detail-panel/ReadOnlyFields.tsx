import type { Deployment } from '@/types';
import styles from './DetailPanel.module.css';

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (key === 'created_at' || key === 'updated_at') {
    return new Date(String(val)).toLocaleString();
  }
  return String(val);
}

const READ_ONLY_FIELDS: Array<{ key: keyof Deployment; label: string }> = [
  { key: 'deployment_id', label: 'Deployment ID' },
  { key: 'version', label: 'Version' },
  { key: 'status', label: 'Status' },
  { key: 'type', label: 'Type' },
  { key: 'environment', label: 'Environment' },
  { key: 'created_by', label: 'Created By' },
  { key: 'created_at', label: 'Created At' },
];

interface ReadOnlyFieldsProps {
  deployment: Deployment;
}

export default function ReadOnlyFields({ deployment }: ReadOnlyFieldsProps) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Details</h3>
      <dl className={styles.fieldList}>
        {READ_ONLY_FIELDS.map(({ key, label }) => (
          <div key={key} className={styles.fieldRow}>
            <dt className={styles.fieldLabel}>{label}</dt>
            <dd className={styles.fieldValue}>{formatValue(key, deployment[key])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

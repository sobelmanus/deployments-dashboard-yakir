import styles from './DetailPanel.module.css';

interface DetailPanelHeaderProps {
  name: string;
  onClose: () => void;
}

export default function DetailPanelHeader({ name, onClose }: DetailPanelHeaderProps) {
  return (
    <div className={styles.panelHeader}>
      <h2 className={styles.panelTitle}>{name}</h2>
      <button onClick={onClose} className={styles.closeButton} aria-label="Close panel">
        ×
      </button>
    </div>
  );
}

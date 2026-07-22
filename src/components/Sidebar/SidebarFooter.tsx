import React from 'react';
import styles from './SidebarFooter.module.css';

interface SidebarFooterProps {
  isDbConnected: boolean;
  dbError: string | null;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({ isDbConnected, dbError }) => (
  <div className={styles.footer}>
    <div
      className={styles.dot}
      style={{
        backgroundColor: isDbConnected ? 'var(--color-success)' : 'var(--color-danger)',
      }}
    />
    <span>{isDbConnected ? 'SQLite Connected' : 'Offline'}</span>
    {dbError && <span className={styles.error}>{dbError}</span>}
  </div>
);

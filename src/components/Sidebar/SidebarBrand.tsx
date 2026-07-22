import React from 'react';
import { Video } from 'lucide-react';
import styles from './SidebarBrand.module.css';

interface SidebarBrandProps {
  totalCount: number;
}

export const SidebarBrand: React.FC<SidebarBrandProps> = ({ totalCount }) => (
  <div className={styles.header}>
    <h1 className={styles.title}>
      <Video size={20} color="var(--color-accent-bright)" />
      Driftara Video
    </h1>
    <p className={styles.subtitle}>{totalCount} videos in library</p>
  </div>
);

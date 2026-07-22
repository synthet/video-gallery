import React from 'react';
import { Folder } from 'lucide-react';
import { folderDisplayName } from '../../utils/format';
import styles from './FolderTree.module.css';

export interface FolderRow {
  id: number;
  path: string;
  image_count?: number;
}

interface FolderTreeProps {
  folders: FolderRow[];
  selectedFolderId: number | null;
  onSelectFolder: (folderId: number | null) => void;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
}) => {
  const visible = folders.filter((f) => folderDisplayName(f.path) !== '.driftara');

  return (
    <div className={styles.panel}>
      <div className={styles.sectionLabel}>Sources</div>
      <div
        className={`${styles.row} ${selectedFolderId === null ? styles.rowActive : ''}`}
        onClick={() => onSelectFolder(null)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelectFolder(null)}
      >
        <span>All folders</span>
      </div>
      {visible.map((f) => {
        const name = folderDisplayName(f.path);
        return (
          <div
            key={f.id}
            className={`${styles.row} ${selectedFolderId === f.id ? styles.rowActive : ''}`}
            onClick={() => onSelectFolder(f.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectFolder(f.id)}
          >
            <span className={styles.rowLabel}>
              <Folder size={12} />
              {name}
            </span>
            {f.image_count != null && (
              <span className={styles.count}>{f.image_count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

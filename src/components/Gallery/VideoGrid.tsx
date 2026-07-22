import React from 'react';
import { Video } from 'lucide-react';
import { VideoCard, type VideoItem } from './VideoCard';
import { folderDisplayName } from '../../utils/format';
import type { FolderRow } from '../Tree/FolderTree';
import styles from './VideoGrid.module.css';

interface VideoGridProps {
  videos: VideoItem[];
  folders: FolderRow[];
  isRefreshing: boolean;
  totalCount: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onOpenVideo: (id: number) => void;
  onClearFilters?: () => void;
  onScan?: () => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  folders,
  isRefreshing,
  totalCount,
  page,
  limit,
  onPageChange,
  onOpenVideo,
  onClearFilters,
  onScan,
}) => {
  if (isRefreshing && videos.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} aria-hidden />
        <span>Loading catalog…</span>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className={styles.empty}>
        <Video size={40} />
        <span className={styles.emptyTitle}>No videos found</span>
        <span className={styles.emptyHint}>Try clearing filters or scan your library.</span>
        <div className={styles.emptyActions}>
          {onClearFilters && (
            <button type="button" onClick={onClearFilters}>
              Clear filters
            </button>
          )}
          {onScan && (
            <button type="button" className="primary" onClick={onScan}>
              Scan library
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gridWrap}>
      {isRefreshing && (
        <div className={styles.refreshOverlay} aria-live="polite">
          <div className={styles.spinner} aria-hidden />
          <span>Refreshing…</span>
        </div>
      )}
      <div className={styles.grid}>
        {videos.map((v) => {
          const folder = folders.find((f) => f.id === v.folder_id);
          const sourceLabel = folder ? folderDisplayName(folder.path) : undefined;
          return (
            <VideoCard
              key={v.id}
              video={v}
              sourceLabel={sourceLabel}
              onOpen={onOpenVideo}
            />
          );
        })}
      </div>
      {totalCount > limit && (
        <footer className={styles.pagination}>
          <span>
            Showing {Math.min(totalCount, (page - 1) * limit + 1)}–{Math.min(totalCount, page * limit)} of{' '}
            {totalCount}
          </span>
          <div className={styles.pageActions}>
            <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
              Previous
            </button>
            <button
              type="button"
              disabled={page * limit >= totalCount}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Star, Video } from 'lucide-react';
import { formatBytes, formatDuration } from '../../utils/format';
import { isElectron } from '../../store/videoStore';
import styles from './VideoCard.module.css';

export interface VideoItem {
  id: number;
  file_name: string;
  title?: string;
  file_path?: string;
  thumbnail_path?: string;
  duration?: number;
  size_bytes?: number;
  captured_at?: string;
  rating?: number;
  folder_id?: number;
}

interface VideoCardProps {
  video: VideoItem;
  sourceLabel?: string;
  onOpen: (id: number) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, sourceLabel, onOpen }) => {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const thumbSrc =
    video.thumbnail_path && !thumbFailed
      ? isElectron
        ? `file:///${video.thumbnail_path.replace(/\\/g, '/')}`
        : `/media/${encodeURIComponent(video.thumbnail_path)}`
      : null;

  const fileSrc = video.file_path
    ? isElectron
      ? `file:///${video.file_path.replace(/\\/g, '/')}`
      : `/media/${encodeURIComponent(video.file_path)}`
    : null;

  const open = () => onOpen(video.id);

  const metaParts: string[] = [];
  if (video.size_bytes && video.size_bytes > 0) metaParts.push(formatBytes(video.size_bytes));
  if (video.captured_at) metaParts.push(video.captured_at);

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      onMouseEnter={() => {
        if (fileSrc) setPreviewReady(true);
      }}
      onFocus={() => {
        if (fileSrc) setPreviewReady(true);
      }}
      aria-label={`Open ${video.title || video.file_name}`}
    >
      <div className={styles.thumbWrap}>
        {sourceLabel && <span className={styles.sourceTag}>{sourceLabel}</span>}
        {(video.duration ?? 0) > 0 && (
          <span className={styles.durationTag}>{formatDuration(video.duration!)}</span>
        )}
        {thumbSrc ? (
          <img
            src={thumbSrc}
            className={styles.thumb}
            alt=""
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <div className={styles.placeholder}>
            <Video size={32} />
            <span className={styles.placeholderName}>{video.file_name}</span>
          </div>
        )}
        {previewReady && fileSrc && (
          <video
            src={fileSrc}
            className={styles.hoverPreview}
            muted
            loop
            preload="none"
            onMouseOver={(e) => {
              void e.currentTarget.play().catch(() => {});
            }}
            onMouseOut={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        )}
      </div>
      <div className={styles.details}>
        <div className={styles.title} title={video.title || video.file_name}>
          {video.title || video.file_name}
        </div>
        {metaParts.length > 0 && (
          <div className={styles.meta}>
            {metaParts.map((part) => (
              <span key={part}>{part}</span>
            ))}
          </div>
        )}
        {(video.rating ?? 0) > 0 && (
          <div className={styles.stars}>
            {Array.from({ length: video.rating! }).map((_, i) => (
              <Star key={i} size={10} className={styles.star} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

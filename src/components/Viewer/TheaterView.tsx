import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LABEL_COLORS } from '@synthet/image-scoring-design';
import { X, Star, ExternalLink, Trash } from 'lucide-react';
import { formatBytes, formatDuration } from '../../utils/format';
import { api, isElectron } from '../../store/videoStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import styles from './TheaterView.module.css';

const LABEL_OPTIONS = ['Red', 'Yellow', 'Green', 'Blue', 'Purple'] as const;
const META_DEBOUNCE_MS = 300;

interface TheaterViewProps {
  video: Record<string, unknown>;
  onClose: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: (deleteFileFromDisk: boolean) => void;
}

export const TheaterView: React.FC<TheaterViewProps> = ({
  video,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState(String(video.title ?? ''));
  const [description, setDescription] = useState(String(video.description ?? ''));

  const filePath = String(video.file_path ?? '');
  const fileSrc = filePath
    ? isElectron
      ? `file:///${filePath.replace(/\\/g, '/')}`
      : `/media/${encodeURIComponent(filePath)}`
    : null;

  const rating = Number(video.rating ?? 0);
  const label = video.label as string | null | undefined;
  const tags = (video.tags as string[]) ?? [];

  useEscapeKey(true, onClose);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    setTitle(String(video.title ?? ''));
    setDescription(String(video.description ?? ''));
  }, [video.id, video.title, video.description]);

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      if (descTimer.current) clearTimeout(descTimer.current);
    };
  }, []);

  const scheduleTitle = useCallback(
    (value: string) => {
      setTitle(value);
      if (titleTimer.current) clearTimeout(titleTimer.current);
      titleTimer.current = setTimeout(() => onUpdate({ title: value }), META_DEBOUNCE_MS);
    },
    [onUpdate],
  );

  const scheduleDescription = useCallback(
    (value: string) => {
      setDescription(value);
      if (descTimer.current) clearTimeout(descTimer.current);
      descTimer.current = setTimeout(() => onUpdate({ description: value }), META_DEBOUNCE_MS);
    },
    [onUpdate],
  );

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Video player">
      <div className={styles.playerPane}>
        <button
          ref={closeRef}
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        {fileSrc && (
          <video src={fileSrc} className={styles.player} controls autoPlay preload="auto" />
        )}
      </div>

      <aside className={styles.sidebar}>
        <h3 className={styles.sectionTitle}>Metadata</h3>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Filename</span>
          <div className={styles.fieldValue}>{String(video.file_name)}</div>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Path</span>
          <div className={styles.fieldValueMuted}>{filePath}</div>
        </div>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Duration</span>
            <div>{formatDuration(Number(video.duration ?? 0))}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Size</span>
            <div>{formatBytes(Number(video.size_bytes ?? 0))}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Dimensions</span>
            <div>
              {String(video.width ?? '')} × {String(video.height ?? '')}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Type</span>
            <div>{String(video.file_type ?? '')}</div>
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Date</span>
          <div>{String(video.captured_at ?? '')}</div>
        </div>

        <div className={styles.divider}>
          <span className={styles.fieldLabel}>Rating</span>
          <div className={styles.ratingRow} role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`${styles.starBtn} ${rating >= star ? styles.starActive : ''}`}
                onClick={() => onUpdate({ rating: rating === star ? 0 : star })}
                aria-label={`${star} star${star === 1 ? '' : 's'}`}
                aria-pressed={rating >= star}
              >
                <Star size={20} className={styles.starIcon} />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.divider}>
          <span className={styles.fieldLabel}>Color label</span>
          <div className={styles.labelRow} role="group" aria-label="Color label">
            {LABEL_OPTIONS.map((id) => (
              <button
                key={id}
                type="button"
                className={`${styles.labelDot} ${label === id ? styles.labelDotActive : ''}`}
                style={{ background: LABEL_COLORS[id.toLowerCase()] }}
                onClick={() => onUpdate({ label: label === id ? null : id })}
                aria-label={id}
                aria-pressed={label === id}
              />
            ))}
          </div>
        </div>

        <div className={styles.divider}>
          <label className={styles.fieldLabel} htmlFor="theater-title">
            Title
          </label>
          <input
            id="theater-title"
            type="text"
            value={title}
            onChange={(e) => scheduleTitle(e.target.value)}
            className={styles.fullWidth}
          />
          <label className={styles.fieldLabelSpaced} htmlFor="theater-description">
            Description
          </label>
          <textarea
            id="theater-description"
            rows={3}
            value={description}
            onChange={(e) => scheduleDescription(e.target.value)}
            className={styles.textarea}
          />
        </div>

        <div className={styles.divider}>
          <span className={styles.fieldLabel}>Tags</span>
          <div className={styles.tags}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                #{tag}
                <button
                  type="button"
                  className={styles.tagRemove}
                  onClick={() => onUpdate({ tags: tags.filter((t) => t !== tag) })}
                  aria-label={`Remove tag ${tag}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <form
            className={styles.tagForm}
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).tagInput as HTMLInputElement;
              const newTag = input.value.trim();
              if (newTag && !tags.includes(newTag)) {
                onUpdate({ tags: [...tags, newTag] });
              }
              input.value = '';
            }}
          >
            <input type="text" name="tagInput" placeholder="Add tag…" className={styles.tagInput} />
            <button type="submit">Add</button>
          </form>
        </div>

        <div className={`${styles.divider} ${styles.actions}`}>
          {isElectron && filePath && (
            <button
              type="button"
              onClick={() => void api.revealInExplorer(filePath)}
              className={styles.fullAction}
            >
              <ExternalLink size={14} />
              Reveal in Explorer
            </button>
          )}
          <button
            type="button"
            className={`danger ${styles.fullAction}`}
            onClick={async () => {
              if (!window.confirm('Remove this video from the catalog?')) return;
              const deleteDisk = window.confirm(
                'Also permanently delete the file from disk? This cannot be undone.',
              );
              await onDelete(deleteDisk);
            }}
          >
            <Trash size={14} />
            Delete video
          </button>
        </div>
      </aside>
    </div>
  );
};

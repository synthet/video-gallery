import React, { useCallback, useEffect, useRef } from 'react';
import { X, FolderOpen, Play, RefreshCw } from 'lucide-react';
import { isElectron } from '../../store/videoStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import styles from './IngestModal.module.css';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingestSourcePath: string;
  isIngesting: boolean;
  ingestLogsConsole: string[];
  onPathChange: (path: string) => void;
  onSelectFolder: () => void;
  onRunIngest: (dryRun: boolean) => void;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  ingestSourcePath,
  isIngesting,
  ingestLogsConsole,
  onPathChange,
  onSelectFolder,
  onRunIngest,
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);

  useEscapeKey(isOpen, handleClose);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal-panel ${styles.panel}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingest-modal-title"
      >
        <div className="modal-header">
          <h2 id="ingest-modal-title" style={{ margin: 0, fontSize: 'var(--font-xl)' }}>
            Import &amp; organize camera cards
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className={styles.hint}>
            SHA-256 dedupe, copy-only import, then organize into source/year folders. Run a dry-run first.
          </p>

          <label className={styles.label} htmlFor="ingest-source-path">
            Source folder or SD card path
          </label>
          <div className={styles.pathRow}>
            <input
              id="ingest-source-path"
              type="text"
              placeholder="e.g. E:\ or E:\DCIM"
              value={ingestSourcePath}
              onChange={(e) => onPathChange(e.target.value)}
              style={{ flex: 1 }}
            />
            {isElectron ? (
              <button type="button" onClick={onSelectFolder}>
                <FolderOpen size={14} />
                Choose
              </button>
            ) : (
              <button type="button" disabled title="Desktop app only">
                Desktop only
              </button>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => onRunIngest(true)}
              disabled={!ingestSourcePath.trim() || isIngesting}
            >
              {isIngesting ? (
                <>
                  <RefreshCw size={14} className="app-spinner" />
                  Running preview…
                </>
              ) : (
                'Dry-run preview (no copies)'
              )}
            </button>
            <button
              type="button"
              className="primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => onRunIngest(false)}
              disabled={!ingestSourcePath.trim() || isIngesting}
            >
              {isIngesting ? (
                <>
                  <RefreshCw size={14} className="app-spinner" />
                  Importing…
                </>
              ) : (
                <>
                  <Play size={14} />
                  Start full ingest &amp; organize
                </>
              )}
            </button>
          </div>

          {(isIngesting || ingestLogsConsole.length > 0) && (
            <div className={styles.logSection}>
              <h3 className={styles.logTitle}>Execution log</h3>
              <div className="terminal-view" style={{ height: 220 }}>
                {ingestLogsConsole.map((line, i) => (
                  <div key={i} className={`terminal-line ${line.startsWith('ERR:') ? 'stderr' : ''}`}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

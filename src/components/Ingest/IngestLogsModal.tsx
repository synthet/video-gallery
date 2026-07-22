import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, History } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import styles from './IngestLogsModal.module.css';

interface IngestLog {
  id: number;
  run_date: string;
  source_path: string;
  copied_count: number;
  skipped_count: number;
  errors_count: number;
  console_output?: string;
}

interface IngestLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: IngestLog[];
}

export const IngestLogsModal: React.FC<IngestLogsModalProps> = ({ isOpen, onClose, logs }) => {
  const [selected, setSelected] = useState<IngestLog | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    setSelected(null);
    onClose();
  }, [onClose]);

  useEscapeKey(isOpen, () => {
    if (selected) {
      setSelected(null);
    } else {
      handleClose();
    }
  });

  useEffect(() => {
    if (!isOpen) {
      setSelected(null);
      return;
    }
    closeRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const activateRow = (log: IngestLog) => setSelected(log);

  return (
    <div className="modal-backdrop" onClick={handleClose} role="presentation">
      <div
        className={`modal-panel ${styles.panel}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logs-modal-title"
      >
        <div className="modal-header">
          <h2 id="logs-modal-title" style={{ margin: 0, fontSize: 'var(--font-xl)' }}>
            Ingest run history
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="modal-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {selected ? (
            <>
              <button type="button" onClick={() => setSelected(null)} style={{ marginBottom: 12 }}>
                Back to list
              </button>
              <h3 style={{ margin: '0 0 12px', fontSize: 'var(--font-base)' }}>
                Run: {selected.run_date}
              </h3>
              <div className={styles.summary}>
                <span>
                  Source: <strong>{selected.source_path}</strong>
                </span>
                <span>
                  Copied: <strong style={{ color: 'var(--color-success)' }}>{selected.copied_count}</strong>
                </span>
                <span>Skipped: {selected.skipped_count}</span>
                <span style={{ color: selected.errors_count > 0 ? 'var(--color-danger)' : undefined }}>
                  Errors: {selected.errors_count}
                </span>
              </div>
              <div className="terminal-view" style={{ height: 360 }}>
                {selected.console_output}
              </div>
            </>
          ) : logs.length === 0 ? (
            <div className={styles.empty}>
              <History size={40} />
              <span>No ingest history yet.</span>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Copied</th>
                  <th>Skipped</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ingest run from ${log.run_date}`}
                    onClick={() => activateRow(log)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        activateRow(log);
                      }
                    }}
                  >
                    <td>{log.run_date}</td>
                    <td>{log.source_path}</td>
                    <td style={{ color: 'var(--color-success)' }}>{log.copied_count}</td>
                    <td>{log.skipped_count}</td>
                    <td style={{ color: log.errors_count > 0 ? 'var(--color-danger)' : undefined }}>
                      {log.errors_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

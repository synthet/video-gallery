import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useVideoStore } from '../../store/videoStore';

export const JobProgressBar: React.FC = () => {
  const scanProgress = useVideoStore((s) => s.scanProgress);
  const isIngesting = useVideoStore((s) => s.isIngesting);

  if (scanProgress.status === 'idle' && !isIngesting) {
    return null;
  }

  let label = '';
  if (isIngesting) {
    label = 'Ingest in progress…';
  } else if (scanProgress.status === 'scanning') {
    label = `Scanning library… (${scanProgress.scanned} scanned)`;
  } else if (scanProgress.status === 'processing_metadata') {
    label = `Indexing metadata (${scanProgress.queueLength} remaining)`;
  }

  if (!label) return null;

  return (
    <div className="job-progress-bar">
      <RefreshCw size={14} className="app-spinner" />
      <span>{label}</span>
    </div>
  );
};

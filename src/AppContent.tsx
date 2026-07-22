import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PanelLeft, RefreshCw, Terminal, History } from 'lucide-react';
import { MainLayout } from './components/Layout/MainLayout';
import { FilterPanel } from './components/Sidebar/FilterPanel';
import { SidebarBrand } from './components/Sidebar/SidebarBrand';
import { SidebarFooter } from './components/Sidebar/SidebarFooter';
import { KeywordSection } from './components/Sidebar/KeywordSection';
import { FolderTree } from './components/Tree/FolderTree';
import { VideoGrid } from './components/Gallery/VideoGrid';
import { TheaterView } from './components/Viewer/TheaterView';
import { IngestModal } from './components/Ingest/IngestModal';
import { IngestLogsModal } from './components/Ingest/IngestLogsModal';
import { useVideoStore } from './store/videoStore';
import { folderDisplayName } from './utils/format';
import { useEscapeKey } from './hooks/useEscapeKey';
import breadcrumbStyles from './styles/breadcrumbs.module.css';

const SIDEBAR_BP = '(max-width: 1100px)';

function initialSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true;
  return !window.matchMedia(SIDEBAR_BP).matches;
}

export function AppContent() {
  const {
    videos,
    folders,
    dates,
    keywords,
    ingestLogs,
    selectedVideoId,
    selectedVideo,
    filters,
    page,
    limit,
    totalCount,
    isDbConnected,
    dbError,
    isRefreshing,
    scanProgress,
    ingestSourcePath,
    isIngesting,
    ingestLogsConsole,
    setFilters,
    clearFilters,
    setPage,
    selectVideo,
    updateVideoDetails,
    deleteSelectedVideo,
    refreshLibrary,
    triggerScanner,
    selectIngestFolder,
    setIngestSourcePath,
    runIngest,
  } = useVideoStore();

  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const [narrowViewport, setNarrowViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(SIDEBAR_BP).matches : false,
  );
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    const mq = window.matchMedia(SIDEBAR_BP);
    const onChange = () => {
      const narrow = mq.matches;
      setNarrowViewport(narrow);
      setSidebarOpen(!narrow);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theaterOpen = selectedVideoId !== null && selectedVideo != null;
  const overlayBlocking = ingestModalOpen || logsModalOpen || theaterOpen;

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEscapeKey(narrowViewport && sidebarOpen && !overlayBlocking, closeSidebar);

  const selectedFolder = folders.find((f) => f.id === filters.folderId);
  const folderName = selectedFolder ? folderDisplayName(selectedFolder.path) : null;

  const breadcrumbs = useMemo(() => {
    if (!folderName) return null;
    return (
      <>
        <button
          type="button"
          className={breadcrumbStyles.breadcrumbButton}
          onClick={() => setFilters({ folderId: null })}
        >
          Library
        </button>
        <span className={breadcrumbStyles.sep}>›</span>
        <button type="button" className={breadcrumbStyles.breadcrumbButton} disabled>
          {folderName}
        </button>
      </>
    );
  }, [folderName, setFilters]);

  const header = (
    <>
      <button
        type="button"
        className="sidebarToggle"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle sidebar"
        aria-expanded={sidebarOpen}
      >
        <PanelLeft size={18} />
      </button>
      <h2 className="top-bar-title">Video Gallery</h2>
      <div className="top-bar-actions">
        <button
          type="button"
          onClick={triggerScanner}
          disabled={scanProgress.status !== 'idle'}
          title="Scan library root"
        >
          <RefreshCw size={14} className={scanProgress.status !== 'idle' ? 'app-spinner' : undefined} />
          Scan
        </button>
        <button
          type="button"
          onClick={() => setIngestModalOpen(true)}
          title="Import from camera card"
        >
          <Terminal size={14} />
          Ingest
          {isIngesting && (
            <span
              style={{
                marginLeft: 4,
                fontSize: 10,
                color: 'var(--color-running)',
                animation: 'pulse 1.5s infinite',
              }}
            >
              …
            </span>
          )}
        </button>
        <button type="button" onClick={() => setLogsModalOpen(true)} title="Ingest history">
          <History size={14} />
          Logs
          {ingestLogs.length > 0 && (
            <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-text-secondary)' }}>
              ({ingestLogs.length})
            </span>
          )}
        </button>
      </div>
    </>
  );

  const sidebar = (
    <>
      <SidebarBrand totalCount={totalCount} />
      <FilterPanel
        filters={filters}
        dates={dates}
        onChange={(partial) => setFilters(partial)}
        onClear={clearFilters}
      />
      <FolderTree
        folders={folders}
        selectedFolderId={filters.folderId}
        onSelectFolder={(folderId) => setFilters({ folderId })}
      />
      <KeywordSection
        keywords={keywords}
        activeKeyword={filters.keyword}
        onSelectKeyword={(keyword) => setFilters({ keyword })}
      />
      <SidebarFooter isDbConnected={isDbConnected} dbError={dbError} />
    </>
  );

  return (
    <>
      <MainLayout
        sidebarOpen={sidebarOpen}
        onSidebarClose={narrowViewport ? closeSidebar : undefined}
        sidebar={sidebar}
        header={header}
        breadcrumbs={breadcrumbs}
        content={
          <VideoGrid
            videos={videos}
            folders={folders}
            isRefreshing={isRefreshing}
            totalCount={totalCount}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onOpenVideo={(id) => void selectVideo(id)}
            onClearFilters={clearFilters}
            onScan={triggerScanner}
          />
        }
      />

      {theaterOpen && (
        <TheaterView
          video={selectedVideo}
          onClose={() => void selectVideo(null)}
          onUpdate={(updates) => void updateVideoDetails(updates)}
          onDelete={(deleteDisk) => void deleteSelectedVideo(deleteDisk)}
        />
      )}

      <IngestModal
        isOpen={ingestModalOpen}
        onClose={() => setIngestModalOpen(false)}
        ingestSourcePath={ingestSourcePath}
        isIngesting={isIngesting}
        ingestLogsConsole={ingestLogsConsole}
        onPathChange={setIngestSourcePath}
        onSelectFolder={() => void selectIngestFolder()}
        onRunIngest={(dryRun) => void runIngest(dryRun)}
      />

      <IngestLogsModal
        isOpen={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        logs={ingestLogs}
      />
    </>
  );
}

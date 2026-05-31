import React, { useEffect, useState, useRef } from 'react';
import { 
  useVideoStore, 
  api, 
  isElectron 
} from './store/videoStore';
import { 
  Video, 
  Folder, 
  Calendar, 
  Tag, 
  Search, 
  Star, 
  Trash, 
  Plus, 
  X, 
  ExternalLink, 
  RefreshCw, 
  Play, 
  Pause, 
  Volume2, 
  Maximize2, 
  Terminal, 
  History, 
  Check, 
  FolderOpen,
  ChevronRight
} from 'lucide-react';

export default function App() {
  const {
    videos,
    folders,
    dates,
    keywords,
    ingestLogs,
    activeTab,
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
    
    setTab,
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
    runIngest
  } = useVideoStore();

  const [searchVal, setSearchVal] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Trigger initial database fetch
  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  // Handle local search input debounce/commit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ keyword: searchVal });
  };

  // Convert bytes to readable size
  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Convert duration to readable time (e.g. 01:23)
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      {/* ── SIDEBAR Navigation ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="brand-title">
            <Video size={24} color="var(--accent-light)" />
            <span>Driftara Video</span>
          </h1>
        </div>

        <nav className="sidebar-nav">
          <div>
            <span className="nav-section-title">Library</span>
            <div 
              className={`nav-item ${activeTab === 'gallery' ? 'active' : ''}`}
              onClick={() => { setTab('gallery'); setSelectedLog(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Video size={16} />
                <span>Video Gallery</span>
              </div>
              <span className="nav-item-count">{totalCount}</span>
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'ingest' ? 'active' : ''}`}
              onClick={() => { setTab('ingest'); setSelectedLog(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Terminal size={16} />
                <span>Ingest Cards</span>
              </div>
              {isIngesting && <span className="nav-item-count" style={{ backgroundColor: 'var(--color-danger)', color: '#fff', animation: 'pulse 1.5s infinite' }}>copying</span>}
            </div>

            <div 
              className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => { setTab('logs'); setSelectedLog(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <History size={16} />
                <span>Ingest Logs</span>
              </div>
              <span className="nav-item-count">{ingestLogs.length}</span>
            </div>
          </div>

          {/* Quick Scanner Sync */}
          <div style={{ padding: '0 12px', marginTop: 10 }}>
            <button 
              className="primary" 
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
              onClick={triggerScanner}
              disabled={scanProgress.status !== 'idle'}
            >
              {scanProgress.status !== 'idle' ? (
                <>
                  <RefreshCw size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>
                    {scanProgress.status === 'scanning' ? 'Scanning...' : `Indexing (${scanProgress.queueLength} left)`}
                  </span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>Scan Library Root</span>
                </>
              )}
            </button>
          </div>

          {/* Folders tree */}
          <div>
            <span className="nav-section-title">Sources</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div 
                className={`nav-item ${filters.folderId === null ? 'active' : ''}`}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={() => setFilters({ folderId: null })}
              >
                <span>All Folders</span>
              </div>
              {folders.map(f => {
                const parts = f.path.split(/[\\/]/);
                const folderName = parts[parts.length - 1] || f.path;
                if (folderName === '.driftara') return null; // Hide catalog directory
                return (
                  <div 
                    key={f.id}
                    className={`nav-item ${filters.folderId === f.id ? 'active' : ''}`}
                    style={{ fontSize: '0.8rem', padding: '6px 12px', paddingLeft: 20 }}
                    onClick={() => setFilters({ folderId: f.id })}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Folder size={12} />
                      <span>{folderName}</span>
                    </div>
                    <span className="nav-item-count" style={{ fontSize: '0.7rem' }}>{f.image_count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chronological calendar */}
          <div>
            <span className="nav-section-title">Calendar Timeline</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 180, overflowY: 'auto' }}>
              <div 
                className={`nav-item ${filters.capturedDate === null ? 'active' : ''}`}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={() => setFilters({ capturedDate: null })}
              >
                <span>All Dates</span>
              </div>
              {dates.map(date => (
                <div 
                  key={date}
                  className={`nav-item ${filters.capturedDate === date ? 'active' : ''}`}
                  style={{ fontSize: '0.8rem', padding: '6px 12px', paddingLeft: 20 }}
                  onClick={() => setFilters({ capturedDate: date })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={12} />
                    <span>{date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords / Tags */}
          {keywords.length > 0 && (
            <div>
              <span className="nav-section-title">Keywords</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 12px' }}>
                <span 
                  className="tag-badge" 
                  style={{
                    fontSize: '0.75rem', padding: '3px 8px', borderRadius: 12, cursor: 'pointer',
                    background: filters.keyword === '' ? 'var(--accent)' : 'var(--bg-surface)',
                    border: '1px solid var(--border-color)'
                  }}
                  onClick={() => setFilters({ keyword: '' })}
                >
                  all
                </span>
                {keywords.map(kw => (
                  <span 
                    key={kw}
                    className="tag-badge" 
                    style={{
                      fontSize: '0.75rem', padding: '3px 8px', borderRadius: 12, cursor: 'pointer',
                      background: filters.keyword === kw ? 'var(--accent)' : 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: filters.keyword === kw ? '#fff' : 'var(--text-secondary)'
                    }}
                    onClick={() => setFilters({ keyword: kw })}
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* DB Connection Status in Footer */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 8, height: 8, borderRadius: '50%', 
            backgroundColor: isDbConnected ? 'var(--color-success)' : 'var(--color-danger)',
            boxShadow: isDbConnected ? '0 0 8px var(--color-success)' : '0 0 8px var(--color-danger)'
          }} />
          <span>{isDbConnected ? 'SQLite Connected' : 'Offline'}</span>
          {dbError && <span style={{ color: 'var(--color-danger)', display: 'block', marginTop: 4 }}>{dbError}</span>}
        </div>
      </aside>

      {/* ── MAIN WORKSPACE PANEL ── */}
      <main style={{ height: '100vh', overflowY: 'auto', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Gallery Tab View */}
        {activeTab === 'gallery' && (
          <>
            {/* Header bar / filters */}
            <header style={{ padding: '24px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: 400, position: 'relative', display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search library, tags, titles..." 
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    style={{
                      width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                      borderRadius: 8, padding: '10px 16px 10px 36px', color: '#fff', fontSize: '0.85rem'
                    }}
                  />
                </div>
                <button type="submit" className="primary" style={{ padding: '0 20px' }}>Search</button>
              </form>

              {/* Advanced inline filter toggles */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Rating filter stars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rating:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} size={14} 
                      className={`star-icon ${filters.minRating >= star ? 'active' : ''}`}
                      onClick={() => setFilters({ minRating: filters.minRating === star ? 0 : star })}
                    />
                  ))}
                </div>

                {/* Color labels picker filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Label:</span>
                  {['Red', 'Yellow', 'Green', 'Blue', 'Purple'].map(label => {
                    const colorMap: Record<string, string> = {
                      Red: 'var(--color-danger)', Yellow: 'var(--color-warning)', 
                      Green: 'var(--color-success)', Blue: 'var(--color-info)', Purple: 'var(--color-purple)'
                    };
                    return (
                      <div 
                        key={label}
                        className={`label-btn ${filters.colorLabel === label ? 'active' : ''}`}
                        style={{ backgroundColor: colorMap[label], width: 14, height: 14 }}
                        onClick={() => setFilters({ colorLabel: filters.colorLabel === label ? null : label })}
                      />
                    );
                  })}
                </div>

                {/* Sort dropdown */}
                <select 
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ sortBy: e.target.value })}
                  style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem'
                  }}
                >
                  <option value="captured_at">Capture Date</option>
                  <option value="file_name">Filename</option>
                  <option value="size_bytes">File Size</option>
                  <option value="duration">Clip Duration</option>
                  <option value="rating">Rating</option>
                </select>

                {/* Clear filters button */}
                {(filters.folderId !== null || filters.capturedDate !== null || filters.minRating > 0 || filters.colorLabel !== null || filters.keyword !== '') && (
                  <button onClick={clearFilters} style={{ fontSize: '0.8rem', padding: '8px 12px', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                    <X size={14} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </header>

            {/* Video Cards Grid */}
            {isRefreshing && videos.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, border: '4px solid var(--bg-surface)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Loading catalog...</span>
              </div>
            ) : videos.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, color: 'var(--text-muted)' }}>
                <Video size={48} />
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>No Videos Found</span>
                <span style={{ fontSize: '0.9rem' }}>Try clearing your active filters or sync your library.</span>
              </div>
            ) : (
              <div className="video-grid">
                {videos.map(v => {
                  const hasThumbnail = !!v.thumbnail_path;
                  return (
                    <div 
                      key={v.id} 
                      className="video-card"
                      onDoubleClick={() => selectVideo(v.id)}
                    >
                      <div className="video-thumbnail-container">
                        {/* Display background tag for folders sources */}
                        {v.folder_id && folders.find(f => f.id === v.folder_id) && (
                          <span className="source-tag">
                            {folders.find(f => f.id === v.folder_id).path.split(/[\\/]/).pop()}
                          </span>
                        )}
                        
                        {/* Media tag details */}
                        <span className="duration-tag">{formatDuration(v.duration)}</span>
                        
                        {/* Stream real JPEG thumbnails via standard API or local file system */}
                        {v.thumbnail_path ? (
                          <img 
                            src={isElectron ? `file:///${v.thumbnail_path.replace(/\\/g, '/')}` : `/media/${encodeURIComponent(v.thumbnail_path)}`}
                            className="video-thumbnail" 
                            alt={v.file_name} 
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#18181b', color: 'var(--text-muted)' }}>
                            <Video size={36} />
                          </div>
                        )}

                        {/* Hover Preview stream actual file natively */}
                        {v.file_path && (
                          <video 
                            src={isElectron ? `file:///${v.file_path.replace(/\\/g, '/')}` : `/media/${encodeURIComponent(v.file_path)}`}
                            className="video-hover-preview"
                            muted
                            loop
                            preload="none"
                            onMouseOver={(e) => {
                              const vid = e.target as HTMLVideoElement;
                              vid.play().catch(() => {});
                            }}
                            onMouseOut={(e) => {
                              const vid = e.target as HTMLVideoElement;
                              vid.pause();
                              vid.currentTime = 0;
                            }}
                          />
                        )}
                      </div>

                      <div className="video-details">
                        <div className="video-title" title={v.title || v.file_name}>
                          {v.title || v.file_name}
                        </div>
                        <div className="video-meta-row">
                          <span>{formatBytes(v.size_bytes)}</span>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}>
                            {v.captured_at}
                          </span>
                        </div>
                        
                        {/* Inline Rating stars */}
                        {v.rating > 0 && (
                          <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
                            {Array.from({ length: v.rating }).map((_, i) => (
                              <Star key={i} size={10} style={{ color: 'var(--color-rating)', fill: 'var(--color-rating)' }} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Footer */}
            {totalCount > limit && (
              <footer style={{ padding: 16, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing {Math.min(totalCount, (page - 1) * limit + 1)} - {Math.min(totalCount, page * limit)} of {totalCount} videos
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Previous
                  </button>
                  <button 
                    disabled={page * limit >= totalCount}
                    onClick={() => setPage(page + 1)}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Next
                  </button>
                </div>
              </footer>
            )}
          </>
        )}

        {/* ── Ingest Cards Tab ── */}
        {activeTab === 'ingest' && (
          <div style={{ padding: 32, maxWidth: 800, margin: '0 auto', width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Terminal color="var(--accent-light)" />
              <span>Import & Organize Camera Cards</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 24 }}>
              Same workflow as <code>ingest_videos.py</code>: SHA-256 dedupe against your library, copy-only import into the library root, then <code>organize_videos.py</code> sorts files into source/year folders (e.g. Nikon/2026/2026-05). Run a dry-run first to preview copies and skips.
            </p>

            <div className="glass-panel" style={{ borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Source Folder or SD Card Directory Path
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input 
                    type="text" 
                    placeholder="e.g. E:\ or E:\DCIM"
                    value={ingestSourcePath}
                    onChange={(e) => setIngestSourcePath(e.target.value)}
                    style={{
                      flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                      borderRadius: 8, padding: '12px 16px', color: '#fff', fontSize: '0.9rem'
                    }}
                  />
                  {isElectron ? (
                    <button onClick={selectIngestFolder} style={{ padding: '0 20px' }}>
                      <FolderOpen size={16} />
                      <span>Choose Folder</span>
                    </button>
                  ) : (
                    <button style={{ cursor: 'not-allowed', color: 'var(--text-disabled)' }} disabled>
                      <span>Selectable in Desktop</span>
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 24px' }}
                  onClick={() => runIngest(true)}
                  disabled={!ingestSourcePath.trim() || isIngesting}
                >
                  {isIngesting ? (
                    <>
                      <RefreshCw size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                      <span>Running preview...</span>
                    </>
                  ) : (
                    <span>Dry-run preview (no copies)</span>
                  )}
                </button>
                <button 
                  className="primary" 
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 24px' }}
                  onClick={() => runIngest(false)}
                  disabled={!ingestSourcePath.trim() || isIngesting}
                >
                  {isIngesting ? (
                    <>
                      <RefreshCw size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                      <span>Importing & organizing... Please wait...</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      <span>Start full ingest & organize</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live stdout stream logs */}
            {(isIngesting || ingestLogsConsole.length > 0) && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ingest Execution Log</h3>
                <div className="terminal-view">
                  {ingestLogsConsole.map((line, i) => (
                    <div key={i} className={`terminal-line ${line.startsWith('ERR:') ? 'stderr' : ''}`}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Ingest Logs History Tab ── */}
        {activeTab === 'logs' && (
          <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto', width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, marginBottom: 8 }}>
              Ingestion Run Logs History
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 24 }}>
              Review the summary outputs of recent automated folder import and organization runs.
            </p>

            {selectedLog ? (
              <div>
                <button onClick={() => setSelectedLog(null)} style={{ marginBottom: 16 }}>
                  <span>Back to Ingest Logs</span>
                </button>
                <div className="glass-panel" style={{ borderRadius: 12, padding: 24, marginBottom: 16 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>Run details: {selectedLog.run_date}</h3>
                  <div style={{ display: 'flex', gap: 24, marginBottom: 16, fontSize: '0.9rem' }}>
                    <div>Source: <strong>{selectedLog.source_path}</strong></div>
                    <div>Copied: <strong style={{ color: 'var(--color-success)' }}>{selectedLog.copied_count}</strong></div>
                    <div>Skipped: <strong style={{ color: 'var(--text-muted)' }}>{selectedLog.skipped_count}</strong></div>
                    <div>Errors: <strong style={{ color: 'var(--color-danger)' }}>{selectedLog.errors_count}</strong></div>
                  </div>
                  <div className="terminal-view" style={{ height: 450 }}>
                    {selectedLog.console_output}
                  </div>
                </div>
              </div>
            ) : ingestLogs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', minHeight: 300 }}>
                <History size={48} />
                <span>No ingest run history found.</span>
              </div>
            ) : (
              <div className="glass-panel" style={{ borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 16px' }}>Date executed</th>
                      <th style={{ padding: '12px 16px' }}>Source folder</th>
                      <th style={{ padding: '12px 16px' }}>Copied</th>
                      <th style={{ padding: '12px 16px' }}>Skipped</th>
                      <th style={{ padding: '12px 16px' }}>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingestLogs.map(log => (
                      <tr 
                        key={log.id} 
                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                        className="nav-item"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{log.run_date}</td>
                        <td style={{ padding: '12px 16px' }}>{log.source_path}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-success)' }}>{log.copied_count} files</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{log.skipped_count} skips</td>
                        <td style={{ padding: '12px 16px', color: log.errors_count > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>{log.errors_count} errors</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── THEATER VIDEO PLAYER OVERLAY ── */}
      {selectedVideoId !== null && selectedVideo && (
        <div className="theater-overlay">
          {/* Left Panel: custom Video Player */}
          <div className="theater-player-container">
            <button className="theater-close" onClick={() => selectVideo(null)}>
              <X size={20} />
            </button>

            {/* Stream native video using HTML5 media layer */}
            {selectedVideo.file_path && (
              <video 
                src={isElectron ? `file:///${selectedVideo.file_path.replace(/\\/g, '/')}` : `/media/${encodeURIComponent(selectedVideo.file_path)}`}
                className="custom-video-player"
                controls
                autoPlay
                preload="auto"
                style={{ width: '90%', outline: 'none' }}
              />
            )}
          </div>

          {/* Right Panel: Metadata details & Tags sidebar */}
          <aside className="theater-sidebar">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
              Metadata Details
            </h3>

            {/* Video File Specifications */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Filename:</span>
                <div style={{ wordBreak: 'break-all', fontWeight: 500, marginTop: 2 }}>{selectedVideo.file_name}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Path:</span>
                <div style={{ wordBreak: 'break-all', color: 'var(--text-secondary)', marginTop: 2, fontSize: '0.8rem' }}>{selectedVideo.file_path}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                  <div style={{ marginTop: 2, fontWeight: 500 }}>{formatDuration(selectedVideo.duration)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>File Size:</span>
                  <div style={{ marginTop: 2, fontWeight: 500 }}>{formatBytes(selectedVideo.size_bytes)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Dimensions:</span>
                  <div style={{ marginTop: 2, fontWeight: 500 }}>{selectedVideo.width} x {selectedVideo.height}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                  <div style={{ marginTop: 2, fontWeight: 500 }}>{selectedVideo.file_type}</div>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                <div style={{ marginTop: 2, fontWeight: 500 }}>{selectedVideo.captured_at}</div>
              </div>
            </div>

            {/* Rating Stars Selection */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Rating</span>
              <div className="rating-star-container">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} size={20} 
                    className={`star-icon ${selectedVideo.rating >= star ? 'active' : ''}`}
                    style={{ fill: selectedVideo.rating >= star ? 'var(--color-rating)' : 'transparent' }}
                    onClick={() => updateVideoDetails({ rating: selectedVideo.rating === star ? 0 : star })}
                  />
                ))}
              </div>
            </div>

            {/* Color Labels Selection */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Color label</span>
              <div className="label-picker">
                {['Red', 'Yellow', 'Green', 'Blue', 'Purple'].map(label => {
                  const colorMap: Record<string, string> = {
                    Red: 'var(--color-danger)', Yellow: 'var(--color-warning)', 
                    Green: 'var(--color-success)', Blue: 'var(--color-info)', Purple: 'var(--color-purple)'
                  };
                  return (
                    <div 
                      key={label}
                      className={`label-btn ${selectedVideo.label === label ? 'active' : ''}`}
                      style={{ backgroundColor: colorMap[label] }}
                      onClick={() => updateVideoDetails({ label: selectedVideo.label === label ? null : label })}
                    />
                  );
                })}
              </div>
            </div>

            {/* Title & Description note fields */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Title</label>
                <input 
                  type="text" 
                  value={selectedVideo.title || ''}
                  onChange={(e) => updateVideoDetails({ title: e.target.value })}
                  style={{
                    width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: '0.85rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Description / Notes</label>
                <textarea 
                  rows={3}
                  value={selectedVideo.description || ''}
                  onChange={(e) => updateVideoDetails({ description: e.target.value })}
                  style={{
                    width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: '0.85rem', resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Tags Keywords editor */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Tags / Keywords</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {selectedVideo.tags && selectedVideo.tags.map((tag: string) => (
                  <span 
                    key={tag} 
                    style={{
                      fontSize: '0.75rem', padding: '3px 8px', borderRadius: 12, background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <span>#{tag}</span>
                    <X 
                      size={10} style={{ cursor: 'pointer' }} 
                      onClick={() => {
                        const newTags = selectedVideo.tags.filter((t: string) => t !== tag);
                        void updateVideoDetails({ tags: newTags });
                      }}
                    />
                  </span>
                ))}
              </div>
              {/* Add tag form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const newTag = String(target.tagInput.value).trim();
                  if (newTag) {
                    const currentTags = selectedVideo.tags || [];
                    if (!currentTags.includes(newTag)) {
                      void updateVideoDetails({ tags: [...currentTags, newTag] });
                    }
                  }
                  target.tagInput.value = '';
                }}
                style={{ display: 'flex', gap: 8 }}
              >
                <input 
                  type="text" 
                  name="tagInput"
                  placeholder="Add a tag..."
                  style={{
                    flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: 6, padding: '6px 12px', color: '#fff', fontSize: '0.8rem'
                  }}
                />
                <button type="submit" style={{ padding: '0 12px', fontSize: '0.8rem' }}>Add</button>
              </form>
            </div>

            {/* Actions panel */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {isElectron && (
                <button 
                  onClick={() => api.revealInExplorer(selectedVideo.file_path)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <ExternalLink size={14} />
                  <span>Reveal in Explorer</span>
                </button>
              )}
              
              <button 
                onClick={async () => {
                  const confirmDelete = window.confirm('Are you sure you want to remove this video from your gallery catalog?');
                  if (confirmDelete) {
                    const deleteDisk = window.confirm('Would you also like to PERMANENTLY delete the video file from your disk? (WARNING: This cannot be undone!)');
                    await deleteSelectedVideo(deleteDisk);
                  }
                }}
                style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
              >
                <Trash size={14} />
                <span>Delete Video File</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

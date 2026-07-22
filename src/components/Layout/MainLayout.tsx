import React from 'react';
import { JobProgressBar } from './JobProgressBar';
import '../../styles/layout.css';

interface MainLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  header?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  sidebarOpen?: boolean;
  onSidebarClose?: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  sidebar,
  content,
  header,
  breadcrumbs,
  sidebarOpen = true,
  onSidebarClose,
}) => {
  const sidebarClass = sidebarOpen ? 'sidebar sidebarOpen' : 'sidebar sidebarCollapsed';
  return (
    <div className="app-container">
      <aside className={sidebarClass}>{sidebar}</aside>
      {sidebarOpen && onSidebarClose && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close sidebar"
          onClick={onSidebarClose}
        />
      )}
      <main className="main-content">
        <header className="top-bar">{header ?? <span>Driftara Video</span>}</header>
        {breadcrumbs && <div className="breadcrumbs-bar">{breadcrumbs}</div>}
        <div className="content-area">{content}</div>
        <JobProgressBar />
      </main>
    </div>
  );
};

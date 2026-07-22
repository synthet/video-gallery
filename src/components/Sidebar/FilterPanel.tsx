import React, { useState } from 'react';
import { LABEL_COLORS, LABEL_FALLBACK_COLOR } from '@synthet/image-scoring-design';
import type { VideoFilters } from '../../store/videoStore';
import styles from './FilterPanel.module.css';

const LABEL_OPTIONS = ['Red', 'Yellow', 'Green', 'Blue', 'Purple'] as const;

interface FilterPanelProps {
  filters: VideoFilters;
  dates: string[];
  onChange: (partial: Partial<VideoFilters>) => void;
  onClear: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ filters, dates, onChange, onClear }) => {
  const [searchVal, setSearchVal] = useState(filters.keyword);

  const hasActiveFilters =
    filters.folderId !== null ||
    filters.capturedDate !== null ||
    filters.minRating > 0 ||
    filters.colorLabel !== null ||
    filters.keyword !== '';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({ keyword: searchVal });
  };

  return (
    <div className={styles.panel}>
      <form className={styles.section} onSubmit={handleSearchSubmit}>
        <label className={styles.sectionLabel} htmlFor="filter-search">
          Search
        </label>
        <div className={styles.searchRow}>
          <input
            id="filter-search"
            type="text"
            className={styles.searchInput}
            placeholder="Titles, tags…"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            aria-label="Search titles and tags"
          />
          <button type="submit" className={`primary ${styles.searchGo}`}>
            Go
          </button>
        </div>
      </form>

      <div className={styles.section}>
        <div className={styles.sectionLabel} id="filter-rating-label">
          Minimum Rating
        </div>
        <div className={styles.ratingRow} role="group" aria-labelledby="filter-rating-label">
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ minRating: r })}
              className={filters.minRating === r ? styles.ratingButtonActive : styles.ratingButton}
              aria-pressed={filters.minRating === r}
            >
              {r === 0 ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel} id="filter-color-label">
          Color Label
        </div>
        <div className={styles.colorRow} role="group" aria-labelledby="filter-color-label">
          <button
            type="button"
            onClick={() => onChange({ colorLabel: null })}
            className={`${styles.colorAllButton} ${!filters.colorLabel ? styles.colorAllButtonActive : ''}`}
            aria-pressed={!filters.colorLabel}
          >
            All
          </button>
          {LABEL_OPTIONS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ colorLabel: filters.colorLabel === id ? null : id })}
              className={`${styles.colorDot} ${filters.colorLabel === id ? styles.colorDotActive : ''}`}
              style={{ background: LABEL_COLORS[id.toLowerCase()] ?? LABEL_FALLBACK_COLOR }}
              title={id}
              aria-label={id}
              aria-pressed={filters.colorLabel === id}
            />
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.sectionLabel} htmlFor="filter-capture-date">
          Capture Date
        </label>
        <select
          id="filter-capture-date"
          className={styles.dateSelect}
          value={filters.capturedDate ?? ''}
          onChange={(e) => onChange({ capturedDate: e.target.value || null })}
        >
          <option value="">All dates</option>
          {dates.map((date) => (
            <option key={date} value={date}>
              {date}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.section}>
        <label className={styles.sectionLabel} htmlFor="filter-sort-by">
          Sort by
        </label>
        <select
          id="filter-sort-by"
          className={styles.sortSelect}
          value={filters.sortBy}
          onChange={(e) => onChange({ sortBy: e.target.value })}
        >
          <option value="captured_at">Capture Date</option>
          <option value="file_name">Filename</option>
          <option value="size_bytes">File Size</option>
          <option value="duration">Duration</option>
          <option value="rating">Rating</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button type="button" className={`danger ${styles.clearFilters}`} onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
};

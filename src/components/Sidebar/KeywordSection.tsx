import React from 'react';
import styles from './KeywordSection.module.css';

interface KeywordSectionProps {
  keywords: string[];
  activeKeyword: string;
  onSelectKeyword: (keyword: string) => void;
}

export const KeywordSection: React.FC<KeywordSectionProps> = ({
  keywords,
  activeKeyword,
  onSelectKeyword,
}) => {
  if (keywords.length === 0) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.sectionLabel}>Keywords</div>
      <div className={styles.chips}>
        <button
          type="button"
          className={`${styles.chip} ${activeKeyword === '' ? styles.chipActive : ''}`}
          onClick={() => onSelectKeyword('')}
          aria-pressed={activeKeyword === ''}
        >
          all
        </button>
        {keywords.map((kw) => (
          <button
            key={kw}
            type="button"
            className={`${styles.chip} ${activeKeyword === kw ? styles.chipActive : ''}`}
            onClick={() => onSelectKeyword(kw)}
            aria-pressed={activeKeyword === kw}
          >
            #{kw}
          </button>
        ))}
      </div>
    </div>
  );
};

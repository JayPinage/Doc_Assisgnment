import React from 'react';

export default function SummarySection({
  icon: Icon,
  title,
  emptyText,
  hasContent,
  children,
}) {
  return (
    <div className="summary-section">
      <div className="section-header">
        {Icon && <Icon className="section-icon" size={16} />}
        <span className="section-title">{title}</span>
      </div>
      <div className={`section-body ${!hasContent ? 'empty' : ''}`}>
        {hasContent ? (
          children
        ) : (
          <div className="empty-state-text">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

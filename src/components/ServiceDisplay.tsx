'use client';

import React, { useState } from 'react';

interface ServiceDisplayProps {
  text?: string | null;
  limitLines?: number;
  size?: 'sm' | 'md';
}

export function ServiceDisplay({ 
  text, 
  limitLines, 
  size = 'md' 
}: ServiceDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  const lines = text.split('\n').filter(Boolean);
  let allSubLines: string[] = [];
  
  lines.forEach(line => {
    // Split by comma if followed by a space and capital letter (likely a new item)
    const sub = line.split(/,(?=\s*[A-Z])/);
    allSubLines = [...allSubLines, ...sub];
  });

  // Sort fertilizer tasks to the top
  const isFertilizer = (text: string) => /fert|bag|\b\d{1,2}-\d{1,2}-\d{1,2}\b/i.test(text);
  
  allSubLines.sort((a, b) => {
    const aFert = isFertilizer(a);
    const bFert = isFertilizer(b);
    if (aFert && !bFert) return -1;
    if (!aFert && bFert) return 1;
    return 0; // Context: maintain original relative order otherwise
  });

  const displayLines = (limitLines && !expanded) ? allSubLines.slice(0, limitLines) : allSubLines;
  const hasMore = limitLines && allSubLines.length > limitLines && !expanded;

  const fontSize = size === 'sm' ? 12 : 13;
  const dotSize = size === 'sm' ? 12 : 14;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {displayLines.map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', color: 'var(--text-muted)' }}>
          <div style={{ color: 'var(--accent)', fontSize: dotSize, lineHeight: '18px' }}>•</div>
          <div style={{ 
            lineHeight: '18px', 
            fontSize,
            maxWidth: (limitLines && !expanded) ? 250 : 'none',
            overflow: (limitLines && !expanded) ? 'hidden' : 'visible',
            textOverflow: (limitLines && !expanded) ? 'ellipsis' : 'clip',
            whiteSpace: (limitLines && !expanded) ? 'nowrap' : 'normal'
          }}>
            {line.trim().replace(/^,?\s*/, '')}
          </div>
        </div>
      ))}
      {hasMore && (
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          style={{ 
            fontSize: 10, 
            color: 'var(--accent)', 
            paddingLeft: 14, 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: 700
          }}
        >
          +{allSubLines.length - limitLines} more
        </button>
      )}
      {expanded && limitLines && allSubLines.length > limitLines && (
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          style={{ 
            fontSize: 10, 
            color: 'var(--text-subtle)', 
            paddingLeft: 14, 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: 700,
            marginTop: 2
          }}
        >
          Show less
        </button>
      )}
    </div>
  );
}

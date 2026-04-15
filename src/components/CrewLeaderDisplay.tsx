'use client';

import React from 'react';

interface CrewLeaderDisplayProps {
  name?: string | null;
  crewMembers?: string | null;
  showMembers?: boolean;
  size?: 'sm' | 'md';
  color?: 'default' | 'muted';
}

export function CrewLeaderDisplay({ 
  name, 
  crewMembers,
  showMembers = true, 
  size = 'md',
  color = 'default'
}: CrewLeaderDisplayProps) {
  if (!name) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  // Extract members either from explicit prop or by auto-splitting the name
  let leader = name;
  let members: string[] = [];
  
  if (crewMembers) {
    members = crewMembers.split(',').map((s: string) => s.trim().replace(/[^\p{L}\p{N}]+$/u, '').replace(/^[^\p{L}\p{N}]+/u, '')).filter(Boolean);
  } else {
    // Fallback: Split on comma, &, or 'and' (case-insensitive) if crewMembers not strictly provided
    const parts = name.split(/,|&|\band\b/i).map((s: string) => s.trim().replace(/[^\p{L}\p{N}]+$/u, '').replace(/^[^\p{L}\p{N}]+/u, '')).filter(Boolean);
    leader = parts[0];
    members = parts.slice(1);
  }

  const fontSize = size === 'sm' ? 11 : 12;
  const memberFontSize = size === 'sm' ? 9 : 10;
  const mainColor = color === 'muted' ? 'var(--text-muted)' : 'var(--text)';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle' }}>
      <div style={{ 
        fontWeight: 600, 
        fontSize, 
        color: mainColor,
        lineHeight: 1.2
      }}>
        {leader}
      </div>
      {showMembers && members.length > 0 && (
        <div style={{ 
          fontSize: memberFontSize, 
          color: 'var(--text-subtle)', 
          marginTop: 1,
          lineHeight: 1
        }}>
          +{members.join(', ')}
        </div>
      )}
    </div>
  );
}

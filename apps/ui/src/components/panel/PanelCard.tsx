import React from 'react';

interface PanelCardProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

export function PanelCard({ id, children, className }: PanelCardProps) {
  return (
    <div id={id} className={`bg-card border border-border rounded-lg p-5${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}

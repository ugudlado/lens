import React from 'react';

interface PanelEmptyProps {
  children: React.ReactNode;
}

export function PanelEmpty({ children }: PanelEmptyProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-8 text-center text-gray-500">
      {children}
    </div>
  );
}

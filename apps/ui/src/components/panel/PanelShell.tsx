import React from 'react';
import { ViewToggle } from './ViewToggle.js';

interface PanelShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  view?: string;
  onViewChange?: (v: string) => void;
  viewOptions?: Array<{ value: string; label: string }>;
  children: React.ReactNode;
}

export function PanelShell({
  title,
  subtitle,
  actions,
  view,
  onViewChange,
  viewOptions,
  children,
}: PanelShellProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {(actions || viewOptions) && (
          <div className="flex items-center gap-2">
            {actions}
            {viewOptions && view !== undefined && onViewChange && (
              <ViewToggle options={viewOptions} value={view} onChange={onViewChange} />
            )}
          </div>
        )}
      </div>
      {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}
      {children}
    </div>
  );
}

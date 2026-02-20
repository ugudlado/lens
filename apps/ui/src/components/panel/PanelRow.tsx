import React from 'react';

interface PanelRowProps {
  trigger: React.ReactNode;
  label?: string;
  expanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PanelRow({ trigger, expanded, onToggle, children, label, actions }: PanelRowProps) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggle}
          tabIndex={onToggle ? 0 : -1}
          aria-disabled={!onToggle || undefined}
          aria-expanded={onToggle ? expanded : undefined}
          aria-label={label}
          className={`flex-1 flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors rounded-lg ${!onToggle ? 'cursor-default' : ''}`}
        >
          {onToggle && (
            <svg
              className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M6 3l5 5-5 5V3z" />
            </svg>
          )}
          {trigger}
        </button>
        {actions && (
          <div className="px-2 flex items-center gap-1 relative">
            {actions}
          </div>
        )}
      </div>
      {expanded && children && (
        <div className="overflow-hidden rounded-b-lg">{children}</div>
      )}
    </div>
  );
}

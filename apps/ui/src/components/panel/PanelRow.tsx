import React from "react";

interface PanelRowProps {
  trigger: React.ReactNode;
  label?: string;
  expanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PanelRow({
  trigger,
  expanded,
  onToggle,
  children,
  label,
  actions,
}: PanelRowProps) {
  return (
    <div className="group rounded-lg border border-border bg-card">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggle}
          tabIndex={onToggle ? 0 : -1}
          aria-disabled={!onToggle || undefined}
          aria-expanded={onToggle ? expanded : undefined}
          aria-label={label}
          className={`flex flex-1 items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-white/5 ${!onToggle ? "cursor-default" : ""}`}
        >
          {onToggle && (
            <svg
              className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M6 3l5 5-5 5V3z" />
            </svg>
          )}
          {trigger}
        </button>
        {actions && (
          <div className="relative flex items-center gap-1 px-2">{actions}</div>
        )}
      </div>
      {expanded && children && (
        <div className="overflow-hidden rounded-b-lg">{children}</div>
      )}
    </div>
  );
}

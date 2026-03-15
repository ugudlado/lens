import React from "react";
import { Separator } from "@/components/ui/separator";
import { ViewToggle } from "./ViewToggle.js";

interface PanelShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  view?: string;
  onViewChange?: (v: string) => void;
  viewOptions?: Array<{ value: string; label: string; title?: string }>;
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        {(actions ?? viewOptions) && (
          <div className="flex items-center gap-2">
            {actions}
            {viewOptions && view !== undefined && onViewChange && (
              <ViewToggle
                options={viewOptions}
                value={view}
                onChange={onViewChange}
              />
            )}
          </div>
        )}
      </div>
      {subtitle && <p className="mb-4 text-sm text-gray-500">{subtitle}</p>}
      <Separator className="mb-6" />
      {children}
    </div>
  );
}

import React from "react";

interface PanelEmptyProps {
  children: React.ReactNode;
}

export function PanelEmpty({ children }: PanelEmptyProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center text-gray-500">
      {children}
    </div>
  );
}

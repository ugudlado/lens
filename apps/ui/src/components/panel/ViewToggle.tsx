import React from "react";

interface ViewToggleProps {
  options: Array<{ value: string; label: string; title?: string }>;
  value: string;
  onChange: (v: string) => void;
}

export function ViewToggle({ options, value, onChange }: ViewToggleProps) {
  return (
    <div className="flex gap-0.5 overflow-hidden rounded-lg border border-border bg-card p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={opt.title}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-white/8 text-gray-100"
              : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

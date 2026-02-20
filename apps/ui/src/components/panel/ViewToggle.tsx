import React from 'react';

interface ViewToggleProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}

export function ViewToggle({ options, value, onChange }: ViewToggleProps) {
  return (
    <div className="flex bg-card border border-border rounded-lg overflow-hidden">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

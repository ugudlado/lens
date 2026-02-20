import React from 'react';

interface DeleteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

export function DeleteButton({ onClick, disabled, title }: DeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title ?? 'Delete'}
      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
    >
      <span aria-hidden="true">✕</span>
    </button>
  );
}

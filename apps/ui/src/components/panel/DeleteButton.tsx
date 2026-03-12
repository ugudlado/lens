import React from "react";

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
      aria-label={title ?? "Delete"}
      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-gray-600 transition-colors hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
    >
      <span aria-hidden="true">✕</span>
    </button>
  );
}

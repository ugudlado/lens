import React from "react";

interface AddButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "header" | "block";
  children: React.ReactNode;
}

export function AddButton({
  onClick,
  disabled,
  variant = "header",
  children,
}: AddButtonProps) {
  const className =
    variant === "block"
      ? "mb-4 px-4 py-2 text-sm font-medium rounded-lg border border-accent/40 text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
      : "px-3 py-1.5 text-xs font-medium rounded-lg border border-accent/40 text-accent hover:bg-accent/10 transition-colors disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

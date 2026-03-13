import { useState, useRef, useEffect } from "react";
import { ConfigScope } from "@lens/schema";
import { ScopeIndicator } from "./ScopeIndicator.js";

// Dot color per scope — mirrors SCOPE_BADGE_STYLES
const SCOPE_DOT: Record<ConfigScope, string> = {
  [ConfigScope.Managed]: "text-rose-400",
  [ConfigScope.Global]: "text-sky-400",
  [ConfigScope.Project]: "text-teal-400",
  [ConfigScope.Local]: "text-amber-400",
};

export interface ScopeMoveOption {
  label: string; // e.g. "Global", "Project", "Local"
  scope?: ConfigScope; // when provided, renders ScopeIndicator + color dot
  filePath?: string; // when provided, renders filename hint
  onCopy: () => Promise<void>;
  onMove?: () => Promise<void>; // absent = move not available to this target
}

interface Props {
  options: ScopeMoveOption[];
  saving: boolean;
}

export function ScopeMoveButton({ options, saving }: Props) {
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [actingLabel, setActingLabel] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (options.length === 0) return null;

  async function handleAction(fn: () => Promise<void>, label: string) {
    setActing(true);
    setActingLabel(label);
    setOpen(false);
    try {
      await fn();
    } finally {
      setActing(false);
      setActingLabel("");
    }
  }

  const moveOptions = options.filter(
    (o): o is ScopeMoveOption & { onMove: () => Promise<void> } =>
      o.onMove !== null && o.onMove !== undefined,
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving || acting}
        className="flex h-6 w-6 items-center justify-center rounded text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300 disabled:opacity-50"
        title="Copy or move to another scope"
      >
        {acting ? (
          <span className="text-[9px] leading-none">
            {actingLabel === "Moving..." ? "↕" : "⋯"}
          </span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
            <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.44A1.5 1.5 0 008.378 6H4.5z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          {/* Copy section */}
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-[10px] text-gray-500">
            <span className="opacity-70">⎘</span>
            <span className="uppercase tracking-wider">Copy to</span>
          </div>
          {options.map((opt) => (
            <button
              key={`copy-${opt.label}`}
              onClick={() => void handleAction(opt.onCopy, "Copying...")}
              disabled={saving || acting}
              className="flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              <span
                className={`text-[8px] ${SCOPE_DOT[opt.scope ?? ConfigScope.Managed]}`}
              >
                ●
              </span>
              {opt.scope ? (
                <ScopeIndicator scope={opt.scope} />
              ) : (
                <span className="text-xs text-gray-300">{opt.label}</span>
              )}
              {opt.filePath && (
                <span className="ml-auto truncate font-mono text-[10px] text-gray-600">
                  {opt.filePath.split("/").pop()}
                </span>
              )}
            </button>
          ))}

          {/* Move section — only rendered when at least one option has onMove */}
          {moveOptions.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 border-b border-t border-border px-3 py-1.5 text-[10px] text-amber-500/80">
                <span className="opacity-70">→</span>
                <span className="uppercase tracking-wider">Move to</span>
              </div>
              {moveOptions.map((opt) => (
                <button
                  key={`move-${opt.label}`}
                  onClick={() => void handleAction(opt.onMove, "Moving...")}
                  disabled={saving || acting}
                  className="flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
                >
                  <span
                    className={`text-[8px] ${SCOPE_DOT[opt.scope ?? ConfigScope.Managed]}`}
                  >
                    ●
                  </span>
                  {opt.scope ? (
                    <ScopeIndicator scope={opt.scope} />
                  ) : (
                    <span className="text-xs text-gray-300">{opt.label}</span>
                  )}
                  {opt.filePath && (
                    <span className="ml-auto truncate font-mono text-[10px] text-gray-600">
                      {opt.filePath.split("/").pop()}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

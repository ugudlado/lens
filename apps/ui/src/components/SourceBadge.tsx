import { SOURCE_BADGE } from "../constants/badgeStyles.js";

export function SourceBadge({ pluginName }: { pluginName?: string | null }) {
  if (!pluginName) return null;
  return (
    <span
      className={`inline-flex items-center rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100 ${SOURCE_BADGE.plugin.bg} ${SOURCE_BADGE.plugin.text}`}
    >
      via {pluginName}
    </span>
  );
}

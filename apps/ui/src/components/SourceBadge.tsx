import { SOURCE_BADGE } from "../constants/badgeStyles.js";

export function SourceBadge({ pluginName }: { pluginName?: string | null }) {
  if (!pluginName) return null;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE.plugin.bg} ${SOURCE_BADGE.plugin.text}`}
    >
      via {pluginName}
    </span>
  );
}

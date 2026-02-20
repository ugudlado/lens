import type { ConfigScope } from '@lens/schema';
import { SCOPE_BADGE_STYLES } from '../constants/badgeStyles.js';

export function ScopeIndicator({ scope }: { scope: ConfigScope }) {
  const { bg, text, label } = SCOPE_BADGE_STYLES[scope];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

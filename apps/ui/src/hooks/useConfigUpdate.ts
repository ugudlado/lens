import { useState, useCallback } from 'react';
import type { ConfigUpdateRequest } from '@lens/schema';

export function useConfigUpdate(onSuccess: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(async (req: ConfigUpdateRequest) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [onSuccess]);

  return { update, saving, error };
}

import { useState, useCallback } from 'react';
import type { PluginActionRequest, PluginActionResponse } from '@lens/schema';

export function usePluginAction(onSuccess: () => void) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (req: PluginActionRequest): Promise<PluginActionResponse> => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      const data: PluginActionResponse = await res.json();
      if (!data.success) throw new Error(data.error || 'Plugin action failed');
      // Delay rescan to allow the CLI to finish writing files to disk
      setTimeout(onSuccess, 800);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setActing(false);
    }
  }, [onSuccess]);

  return { run, acting, error, clearError: () => setError(null) };
}

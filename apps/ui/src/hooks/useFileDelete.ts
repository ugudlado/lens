import { useState, useCallback } from 'react';

export function useFileDelete(onSuccess: () => void) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteFile = useCallback(async (filePath: string) => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Delete failed');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDeleting(false);
    }
  }, [onSuccess]);

  return { deleteFile, deleting, error, clearError: () => setError(null) };
}

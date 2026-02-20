import { useState, useEffect, useRef } from 'react';
import { ConfigScope } from '@lens/schema';
import { ScopeIndicator } from './ScopeIndicator';
import { CodeEditor } from './CodeEditor';
import { useConfigUpdate } from '../hooks/useConfigUpdate';

interface FileRef {
  scope: ConfigScope;
  filePath: string;
}

interface Props {
  files: FileRef[];
  onRescan: () => void;
  /** Auto-expand the file at this path and scroll to the highlightKey within it */
  autoExpandFile?: string;
  /** Key/text to highlight within the auto-expanded file */
  highlightKey?: string;
}

/** Find the 1-based line number where a key appears in file content */
function findKeyLine(content: string, key: string): number | null {
  const lines = content.split('\n');
  // Try JSON property pattern first: "key":
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyPattern = new RegExp(`"${escaped}"\\s*:`);
  let idx = lines.findIndex(l => keyPattern.test(l));
  if (idx !== -1) return idx + 1;
  // Fallback: plain text match
  idx = lines.findIndex(l => l.includes(key));
  if (idx !== -1) return idx + 1;
  return null;
}

export function RawJsonView({ files, onRescan, autoExpandFile, highlightKey }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [fileContents, setFileContents] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [highlightFileIdx, setHighlightFileIdx] = useState<number | null>(null);
  const fileRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const autoExpandDone = useRef(false);

  const { update, saving, error } = useConfigUpdate(() => {
    const savedIdx = editingIdx;
    setEditingIdx(null);
    setParseError(null);
    if (savedIdx !== null) {
      loadContent(savedIdx, uniqueRef.current[savedIdx]?.filePath || files[savedIdx]?.filePath);
    }
    onRescan();
  });

  // Deduplicate files by path — must be stable for effects
  const unique = files.filter((f, i, arr) =>
    arr.findIndex(x => x.filePath === f.filePath) === i
  );
  const uniqueRef = useRef(unique);
  uniqueRef.current = unique;

  async function loadContent(idx: number, filePath: string) {
    setLoading(prev => new Set(prev).add(idx));
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContents(prev => ({ ...prev, [idx]: data.content }));
      }
    } catch { /* ignore */ }
    setLoading(prev => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  }

  const toggle = (idx: number) => {
    setHighlightLine(null);
    setHighlightFileIdx(null);
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
        if (!fileContents[idx] && !loading.has(idx)) {
          loadContent(idx, uniqueRef.current[idx].filePath);
        }
      }
      return next;
    });
  };

  function startEdit(idx: number) {
    setEditValue(fileContents[idx] || '');
    setEditingIdx(idx);
    setParseError(null);
    setHighlightLine(null);
    setHighlightFileIdx(null);
  }

  function saveEdit(file: FileRef) {
    if (file.filePath.endsWith('.json')) {
      try {
        JSON.parse(editValue);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Invalid JSON');
        return;
      }
      setParseError(null);
      update({
        surface: 'raw',
        scope: file.scope,
        filePath: file.filePath,
        value: JSON.parse(editValue),
        replace: true,
      });
    } else {
      update({
        surface: 'raw',
        scope: file.scope,
        filePath: file.filePath,
        value: editValue,
      });
    }
  }

  // Auto-expand the target file when autoExpandFile is set
  useEffect(() => {
    if (!autoExpandFile || autoExpandDone.current) return;
    const idx = uniqueRef.current.findIndex(f => f.filePath === autoExpandFile);
    if (idx === -1) return;
    autoExpandDone.current = true;
    setExpanded(new Set([idx]));
    if (!fileContents[idx] && !loading.has(idx)) {
      loadContent(idx, uniqueRef.current[idx].filePath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExpandFile]);

  // Reset autoExpandDone when autoExpandFile changes
  useEffect(() => {
    autoExpandDone.current = false;
  }, [autoExpandFile, highlightKey]);

  // When content loads for the auto-expanded file, find the highlight line and scroll
  useEffect(() => {
    if (!autoExpandFile || !highlightKey) return;
    const idx = uniqueRef.current.findIndex(f => f.filePath === autoExpandFile);
    if (idx === -1 || !fileContents[idx]) return;

    const line = findKeyLine(fileContents[idx], highlightKey);
    if (line !== null) {
      setHighlightLine(line);
      setHighlightFileIdx(idx);
    }

    // Scroll the file card into view
    const el = fileRefs.current[idx];
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExpandFile, highlightKey, fileContents]);

  if (unique.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center text-gray-500">
        No config files found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {unique.map((file, i) => {
        const isExpanded = expanded.has(i);
        const isEditing = editingIdx === i;
        const isJson = file.filePath.endsWith('.json');
        const content = fileContents[i];
        const isLoading = loading.has(i);
        const isHighlighted = highlightFileIdx === i && highlightLine !== null;

        return (
          <div
            key={file.filePath}
            ref={el => { fileRefs.current[i] = el; }}
            className={`bg-card border rounded-lg overflow-hidden ${
              isHighlighted ? 'border-accent/40' : 'border-border'
            }`}
          >
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                {'\u25B6'}
              </span>
              <ScopeIndicator scope={file.scope} />
              <span className="text-sm font-mono text-gray-300 truncate flex-1 text-left">{file.filePath}</span>
            </button>

            {isExpanded && (
              <div className="border-t border-border px-4 py-3">
                {isLoading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : isEditing ? (
                  <>
                    <CodeEditor
                      value={editValue}
                      onChange={setEditValue}
                      language={isJson ? 'json' : 'markdown'}
                      height="400px"
                    />
                    {parseError && (
                      <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs font-mono">
                        {parseError}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => saveEdit(file)}
                        disabled={saving}
                        className="px-3 py-1 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setEditingIdx(null); setParseError(null); }}
                        disabled={saving}
                        className="px-3 py-1 text-xs font-medium rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <HighlightedPre content={content ?? 'No content'} highlightLine={isHighlighted ? highlightLine : null} />
                    {file.scope !== ConfigScope.Managed && (
                      <button
                        onClick={() => startEdit(i)}
                        className="mt-2 px-3 py-1 text-xs font-medium rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Pre block that highlights a specific line and scrolls to it */
function HighlightedPre({ content, highlightLine }: { content: string; highlightLine: number | null }) {
  const preRef = useRef<HTMLPreElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (highlightLine && lineRef.current && preRef.current) {
      // Scroll the highlighted line into view within the pre container
      setTimeout(() => {
        lineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [highlightLine]);

  if (!highlightLine) {
    return (
      <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
        {content}
      </pre>
    );
  }

  const lines = content.split('\n');

  return (
    <pre ref={preRef} className="text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
      {lines.map((line, idx) => {
        const lineNum = idx + 1;
        const isTarget = lineNum === highlightLine;
        return (
          <span
            key={idx}
            ref={isTarget ? lineRef : undefined}
            className={isTarget ? 'bg-accent/20 block -mx-1 px-1 rounded' : undefined}
          >
            {line}
            {idx < lines.length - 1 ? '\n' : ''}
          </span>
        );
      })}
    </pre>
  );
}

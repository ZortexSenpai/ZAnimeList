import { useState } from 'react';
import { importMal, importAnilistByUsername, importAnilistFile, exportMal, type ImportResult, type ImportProgress } from '../services/api';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

type Provider = 'mal' | 'anilist';
type AnilistMethod = 'username' | 'file';

export function ImportModal({ onClose, onImported }: Props) {
  const [provider, setProvider] = useState<Provider>('mal');
  const [anilistMethod, setAnilistMethod] = useState<AnilistMethod>('username');
  const [username, setUsername] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    try {
      let res: ImportResult;
      const onProgress = (p: ImportProgress) => setProgress(p);
      if (provider === 'mal') {
        if (!file) { setError('Please select your MAL XML export file.'); return; }
        res = await importMal(file, onProgress);
      } else {
        if (anilistMethod === 'username') {
          if (!username.trim()) { setError('Please enter your AniList username.'); return; }
          res = await importAnilistByUsername(username.trim(), onProgress);
        } else {
          if (!file) { setError('Please select your AniList JSON export file.'); return; }
          res = await importAnilistFile(file, onProgress);
        }
      }
      setResult(res);
      onImported();
    } catch (e: any) {
      setError(e.message ?? 'Import failed. Please try again.');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl shadow-black/40 border border-zinc-200 dark:border-white/10 w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Import / Export</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Provider tabs */}
          <div className="flex rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden p-0.5 gap-0.5 bg-zinc-100 dark:bg-white/5">
            {(['mal', 'anilist'] as Provider[]).map(p => (
              <button
                key={p}
                onClick={() => { setProvider(p); setResult(null); setError(null); setFile(null); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                  provider === p
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                {p === 'mal' ? 'MyAnimeList' : 'AniList'}
              </button>
            ))}
          </div>

          {provider === 'mal' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Export from <span className="font-medium text-zinc-700 dark:text-zinc-300">myanimelist.net → Profile → Export anime list</span> and upload here.
              </p>
              <FileInput accept=".xml" onFile={setFile} current={file} />
            </div>
          )}

          {provider === 'anilist' && (
            <div className="flex flex-col gap-3">
              <div className="flex rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden p-0.5 gap-0.5 bg-zinc-100 dark:bg-white/5">
                {(['username', 'file'] as AnilistMethod[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setAnilistMethod(m); setFile(null); setResult(null); setError(null); }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                      anilistMethod === m
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    {m === 'username' ? 'By Username (public)' : 'JSON File'}
                  </button>
                ))}
              </div>

              {anilistMethod === 'username' ? (
                <input
                  type="text"
                  placeholder="AniList username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-zinc-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder-zinc-400 dark:placeholder-zinc-600"
                />
              ) : (
                <FileInput accept=".json" onFile={setFile} current={file} />
              )}
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="flex flex-col gap-2 animate-fade-in">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Importing…</span>
                {progress && (
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium tabular-nums">
                    {progress.processed}{progress.total != null ? ` / ${progress.total}` : ''}
                  </span>
                )}
              </div>
              {progress?.total != null ? (
                <div className="w-full bg-zinc-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, (progress.processed / progress.total) * 100)}%` }}
                  />
                </div>
              ) : (
                <div className="w-full bg-zinc-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full w-1/3 bg-indigo-500 rounded-full animate-[shimmer_1.2s_ease-in-out_infinite]" />
                </div>
              )}
              {progress?.current && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{progress.current}</p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* Result */}
          {result && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-700 dark:text-emerald-300 animate-fade-in">
              <p className="font-semibold">Import complete</p>
              <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                {result.imported} imported · {result.skipped} skipped
              </p>
              {result.errors.length > 0 && (
                <details className="mt-1.5">
                  <summary className="cursor-pointer text-xs text-emerald-500">{result.errors.length} errors</summary>
                  <ul className="mt-1 text-xs list-disc list-inside text-emerald-600 dark:text-emerald-400 space-y-0.5">
                    {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
            >
              {loading ? 'Importing…' : 'Import'}
            </button>
            {provider === 'mal' && (
              <button
                onClick={() => exportMal()}
                className="flex-1 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
              >
                Export XML
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileInput({ accept, onFile, current }: { accept: string; onFile: (f: File) => void; current: File | null }) {
  return (
    <label className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all duration-150 ${
      current
        ? 'border-indigo-400 dark:border-indigo-500/60 bg-indigo-50 dark:bg-indigo-500/10'
        : 'border-zinc-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:bg-zinc-50 dark:hover:bg-white/5'
    }`}>
      <span className="text-2xl">{current ? '✓' : '📂'}</span>
      <span className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
        {current ? current.name : `Click to select ${accept} file`}
      </span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}

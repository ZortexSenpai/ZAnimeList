import { useState } from 'react';
import { importMal, importAnilistByUsername, importAnilistFile, exportMal, type ImportResult } from '../services/api';

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
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res: ImportResult;
      if (provider === 'mal') {
        if (!file) { setError('Please select your MAL XML export file.'); return; }
        res = await importMal(file);
      } else {
        if (anilistMethod === 'username') {
          if (!username.trim()) { setError('Please enter your AniList username.'); return; }
          res = await importAnilistByUsername(username.trim());
        } else {
          if (!file) { setError('Please select your AniList JSON export file.'); return; }
          res = await importAnilistFile(file);
        }
      }
      setResult(res);
      onImported();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import / Export</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Provider Tabs */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['mal', 'anilist'] as Provider[]).map(p => (
              <button
                key={p}
                onClick={() => { setProvider(p); setResult(null); setError(null); setFile(null); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  provider === p
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {p === 'mal' ? 'MyAnimeList' : 'AniList'}
              </button>
            ))}
          </div>

          {provider === 'mal' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Export your list from <span className="font-medium">myanimelist.net → Profile → Export anime list</span> and upload the XML file here.
              </p>
              <FileInput accept=".xml" onFile={setFile} />
            </div>
          )}

          {provider === 'anilist' && (
            <div className="flex flex-col gap-3">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {(['username', 'file'] as AnilistMethod[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setAnilistMethod(m); setFile(null); setResult(null); setError(null); }}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                      anilistMethod === m
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <FileInput accept=".json" onFile={setFile} />
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {result && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-800 dark:text-green-200">
              <p className="font-medium">Import complete</p>
              <p>{result.imported} imported · {result.skipped} skipped</p>
              {result.errors.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs">{result.errors.length} errors</summary>
                  <ul className="mt-1 text-xs list-disc list-inside">
                    {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import'}
            </button>
            {provider === 'mal' && (
              <button
                onClick={() => exportMal()}
                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Export MAL XML
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileInput({ accept, onFile }: { accept: string; onFile: (f: File) => void }) {
  return (
    <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:border-indigo-400 transition-colors">
      <span className="text-2xl">📂</span>
      <span className="text-sm text-gray-500 dark:text-gray-400">Click to select {accept} file</span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}

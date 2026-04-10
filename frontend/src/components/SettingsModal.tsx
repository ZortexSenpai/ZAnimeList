import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../services/api';
import type { ImageSource } from '../services/api';

interface Props {
  onClose: () => void;
}

const IMAGE_SOURCE_OPTIONS: { value: ImageSource; label: string; description: string }[] = [
  {
    value: 'Local',
    label: 'Local (Database)',
    description: 'Download cover images and store them in the local database. Works offline after import but uses more storage.',
  },
  {
    value: 'Anilist',
    label: 'AniList CDN',
    description: 'Store AniList image URLs. Faster imports, but images require an internet connection to display.',
  },
  {
    value: 'MyAnimeList',
    label: 'MyAnimeList CDN',
    description: 'Store MyAnimeList image URLs via Jikan. Note: MAL imports with this option make one API call per entry and may be slow.',
  },
];

export function SettingsModal({ onClose }: Props) {
  const [imageSource, setImageSource] = useState<ImageSource>('Local');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings()
      .then(s => setImageSource(s.imageSource))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings({ imageSource });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl shadow-black/40 border border-zinc-200 dark:border-white/10 w-full max-w-lg flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-xl"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Cover Image Source
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
              Controls where cover images are fetched from during import. Applies to future imports only.
            </p>

            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {IMAGE_SOURCE_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                      imageSource === opt.value
                        ? 'border-indigo-500/60 bg-indigo-50 dark:bg-indigo-500/10'
                        : 'border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="imageSource"
                      value={opt.value}
                      checked={imageSource === opt.value}
                      onChange={() => setImageSource(opt.value)}
                      className="mt-0.5 accent-indigo-600 shrink-0"
                    />
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-white">{opt.label}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-zinc-100 dark:border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

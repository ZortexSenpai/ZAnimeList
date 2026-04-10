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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Cover Image Source
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Controls where cover images are fetched from during import. Applies to future imports only.
            </p>

            {loading ? (
              <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
            ) : (
              <div className="space-y-3">
                {IMAGE_SOURCE_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      imageSource === opt.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getSettings, updateSettings, updateProfile } from '../services/api';
import type { ImageSource, AutoSyncInterval } from '../services/api';
import type { Theme } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onClose: () => void;
  onBack?: () => void;
  onSaved?: () => void;
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

const AUTO_SYNC_OPTIONS: { value: AutoSyncInterval | null; label: string }[] = [
  { value: null,     label: 'Disabled' },
  { value: '15min',  label: 'Every 15 minutes' },
  { value: '30min',  label: 'Every 30 minutes' },
  { value: '1h',     label: 'Every hour' },
  { value: '6h',     label: 'Every 6 hours' },
  { value: '1d',     label: 'Every day' },
  { value: '1week',  label: 'Every week' },
];

const THEME_GROUPS: { label: string; options: { value: Theme; label: string; description: string }[] }[] = [
  {
    label: 'Default',
    options: [
      { value: 'System', label: 'System', description: 'Follows your device light/dark preference.' },
    ],
  },
  {
    label: 'Dark',
    options: [
      { value: 'Dark', label: 'Dark', description: 'Standard dark theme.' },
      { value: 'OLED', label: 'OLED', description: 'Pure black, ideal for OLED screens.' },
      { value: 'Midnight', label: 'Midnight', description: 'Deep navy blue dark theme.' },
      { value: 'Nord', label: 'Nord', description: 'Cool arctic slate-blue dark theme.' },
      { value: 'Dracula', label: 'Dracula', description: 'Purple-tinted dark theme.' },
    ],
  },
  {
    label: 'Light',
    options: [
      { value: 'Light', label: 'Light', description: 'Standard light theme.' },
      { value: 'Sepia', label: 'Sepia', description: 'Warm cream tones, easier on the eyes.' },
      { value: 'Rose', label: 'Rosé', description: 'Soft warm pink tinted light theme.' },
      { value: 'Mint', label: 'Mint', description: 'Cool green tinted light theme.' },
    ],
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-zinc-100 dark:border-white/5 my-5" />;
}

export function SettingsModal({ onClose, onBack, onSaved }: Props) {
  const { user, updateUser } = useAuth();

  // Profile state
  const [anilistUsername, setAnilistUsername] = useState(user?.anilistUsername ?? '');
  const [malUsername, setMalUsername] = useState(user?.malUsername ?? '');
  const [theme, setTheme] = useState<Theme>(user?.theme ?? 'System');
  // Global settings state (admin-only)
  const [imageSource, setImageSource] = useState<ImageSource>('Local');
  const [autoSyncInterval, setAutoSyncInterval] = useState<AutoSyncInterval | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings()
      .then(s => {
        setImageSource(s.imageSource);
        setAutoSyncInterval(s.autoSyncInterval);
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, []);

  const isAdmin = user?.role === 'Admin';

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updatedUser = await updateProfile({ anilistUsername: anilistUsername.trim() || null, malUsername: malUsername.trim() || null, theme });
      if (isAdmin) await updateSettings({ imageSource, autoSyncInterval });
      updateUser(updatedUser);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl shadow-black/40 border border-zinc-200 dark:border-white/10 w-full max-w-lg flex flex-col animate-scale-in max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 2 3 6 7 10" />
                </svg>
                Back to Import
              </button>
            )}
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-xl"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">

          {/* Account links */}
          <SectionLabel>Account Links</SectionLabel>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                AniList username
              </label>
              <input
                type="text"
                value={anilistUsername}
                onChange={e => setAnilistUsername(e.target.value)}
                placeholder="your_anilist_name"
                className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                MyAnimeList username
              </label>
              <input
                type="text"
                value={malUsername}
                onChange={e => setMalUsername(e.target.value)}
                placeholder="your_mal_name"
                className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <Divider />

          {/* Theme */}
          <SectionLabel>Appearance</SectionLabel>
          <div className="space-y-4">
            {THEME_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-2 pl-0.5">{group.label}</p>
                <div className="space-y-2">
                  {group.options.map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                        theme === opt.value
                          ? 'border-indigo-500/60 bg-indigo-50 dark:bg-indigo-500/10'
                          : 'border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={opt.value}
                        checked={theme === opt.value}
                        onChange={() => setTheme(opt.value)}
                        className="mt-0.5 accent-indigo-600 shrink-0"
                      />
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-white">{opt.label}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Admin-only: global settings */}
          {isAdmin && (
            <>
              <Divider />

              {/* Cover image source */}
              <SectionLabel>Cover Image Source</SectionLabel>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
                Controls where cover images are fetched from during import. Applies to future imports only.
              </p>

              {settingsLoading ? (
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

              <Divider />

              {/* Auto Sync */}
              <SectionLabel>AniList Auto Sync</SectionLabel>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
                Automatically re-import all users' AniList libraries on a schedule. New entries are added; existing ones are not overwritten.
              </p>
              {settingsLoading ? (
                <div className="h-9 rounded-lg bg-zinc-100 dark:bg-white/5 animate-pulse" />
              ) : (
                <select
                  value={autoSyncInterval ?? ''}
                  onChange={e => setAutoSyncInterval((e.target.value || null) as AutoSyncInterval | null)}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                >
                  {AUTO_SYNC_OPTIONS.map(opt => (
                    <option key={opt.value ?? ''} value={opt.value ?? ''}>{opt.label}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-zinc-100 dark:border-white/5 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving || settingsLoading}
            className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

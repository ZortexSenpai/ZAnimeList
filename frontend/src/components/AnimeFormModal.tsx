import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import type { Anime, AnimeStatus, CreateAnime } from '../types/anime';
import { STATUS_LABELS } from '../types/anime';
import { searchAnilist } from '../services/api';
import type { AnilistSearchResult } from '../services/api';

const ALL_STATUSES: AnimeStatus[] = ['Watching', 'Completed', 'PlanToWatch', 'OnHold', 'Dropped'];

interface Props {
  anime?: Anime;
  onSave: (data: CreateAnime) => Promise<void>;
  onClose: () => void;
}

const emptyForm = (): CreateAnime => ({
  title: '',
  titleEnglish: '',
  synopsis: '',
  coverImageUrl: '',
  totalEpisodes: undefined,
  episodesWatched: 0,
  status: 'PlanToWatch',
  score: undefined,
  genres: [],
});

export function AnimeFormModal({ anime, onSave, onClose }: Props) {
  const [form, setForm] = useState<CreateAnime>(emptyForm);
  const [genreInput, setGenreInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AnilistSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (anime) {
      setForm({
        title: anime.title,
        titleEnglish: anime.titleEnglish ?? '',
        synopsis: anime.synopsis ?? '',
        coverImageUrl: anime.coverImageUrl ?? '',
        totalEpisodes: anime.totalEpisodes ?? undefined,
        episodesWatched: anime.episodesWatched,
        status: anime.status,
        score: anime.score ?? undefined,
        startedAt: anime.startedAt ? anime.startedAt.slice(0, 10) : undefined,
        finishedAt: anime.finishedAt ? anime.finishedAt.slice(0, 10) : undefined,
        genres: [...anime.genres],
      });
    } else {
      setForm(emptyForm());
    }
  }, [anime]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchAnilist(searchQuery);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectResult = (result: AnilistSearchResult) => {
    setForm(f => ({
      ...f,
      title: result.title,
      titleEnglish: result.titleEnglish ?? '',
      synopsis: result.synopsis ?? '',
      coverImageUrl: result.coverImageUrl ?? '',
      totalEpisodes: result.totalEpisodes ?? undefined,
      malId: result.malId ?? undefined,
      anilistId: result.anilistId,
      genres: result.genres,
    }));
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  const addGenre = () => {
    const g = genreInput.trim();
    if (g && !form.genres.includes(g))
      setForm(f => ({ ...f, genres: [...f.genres, g] }));
    setGenreInput('');
  };

  const removeGenre = (g: string) =>
    setForm(f => ({ ...f, genres: f.genres.filter(x => x !== g) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err: unknown) {
      let message = 'Failed to save. Please try again.';
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (typeof data === 'string' && data) message = data;
        else if (typeof data?.message === 'string' && data.message) message = data.message;
        else if (typeof data?.title === 'string' && data.title) message = data.title;
        else if (err.message) message = err.message;
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 w-full sm:rounded-2xl sm:max-w-lg shadow-2xl shadow-black/40 border-t sm:border border-zinc-200 dark:border-white/10 max-h-[92vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5 flex-shrink-0">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            {anime ? 'Edit Anime' : 'Add Anime'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
          {/* AniList search — add mode only */}
          {!anime && (
            <div ref={searchRef} className="relative">
              <Field label="Search AniList">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by title to auto-fill…"
                    className={inputCls + ' pr-8'}
                    autoComplete="off"
                  />
                  {searching && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs animate-pulse">…</span>
                  )}
                </div>
              </Field>

              {showDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden animate-scale-in">
                  {searchResults.map(result => (
                    <button
                      key={result.anilistId}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-white/5 text-left transition-colors"
                    >
                      {result.coverImageUrl && (
                        <img src={result.coverImageUrl} alt="" className="w-8 h-12 object-cover rounded flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">{result.title}</div>
                        {result.titleEnglish && result.titleEnglish !== result.title && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{result.titleEnglish}</div>
                        )}
                        {result.totalEpisodes != null && (
                          <div className="text-xs text-zinc-400">{result.totalEpisodes} eps</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!anime && <hr className="border-zinc-100 dark:border-white/5" />}

          <Field label="Title *">
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
          </Field>

          <Field label="English Title">
            <input value={form.titleEnglish} onChange={e => setForm(f => ({ ...f, titleEnglish: e.target.value }))} className={inputCls} />
          </Field>

          <Field label="Cover Image URL">
            <input value={form.coverImageUrl} onChange={e => setForm(f => ({ ...f, coverImageUrl: e.target.value }))} className={inputCls} />
          </Field>

          <Field label="Status *">
            <select required value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AnimeStatus }))} className={inputCls}>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Watched">
              <input type="number" min={0} value={form.episodesWatched} onChange={e => setForm(f => ({ ...f, episodesWatched: +e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Total Episodes">
              <input type="number" min={0} value={form.totalEpisodes ?? ''} onChange={e => setForm(f => ({ ...f, totalEpisodes: e.target.value ? +e.target.value : undefined }))} className={inputCls} />
            </Field>
          </div>

          <Field label="Score (1–10)">
            <input type="number" min={1} max={10} value={form.score ?? ''} onChange={e => setForm(f => ({ ...f, score: e.target.value ? +e.target.value : undefined }))} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Started At">
              <input type="date" value={form.startedAt ?? ''} onChange={e => setForm(f => ({ ...f, startedAt: e.target.value || undefined }))} className={inputCls} />
            </Field>
            <Field label="Finished At">
              <input type="date" value={form.finishedAt ?? ''} onChange={e => setForm(f => ({ ...f, finishedAt: e.target.value || undefined }))} className={inputCls} />
            </Field>
          </div>

          <Field label="Synopsis">
            <textarea rows={3} value={form.synopsis} onChange={e => setForm(f => ({ ...f, synopsis: e.target.value }))} className={inputCls + ' resize-none'} />
          </Field>

          <Field label="Genres">
            <div className="flex gap-2">
              <input
                value={genreInput}
                onChange={e => setGenreInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGenre())}
                placeholder="Add genre…"
                className={inputCls + ' flex-1'}
              />
              <button type="button" onClick={addGenre} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                Add
              </button>
            </div>
            {form.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.genres.map(g => (
                  <span key={g} className="inline-flex items-center gap-1 text-xs bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-full">
                    {g}
                    <button type="button" onClick={() => removeGenre(g)} className="text-zinc-400 hover:text-rose-500 leading-none transition-colors">×</button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          {error && (
            <p className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
            >
              {saving ? 'Saving…' : anime ? 'Save Changes' : 'Add Anime'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder-zinc-400 dark:placeholder-zinc-600';

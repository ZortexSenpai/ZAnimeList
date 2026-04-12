import type { AnimeFilters, AnimeStatus, SortBy } from '../types/anime';
import { STATUS_LABELS } from '../types/anime';
import { MultiSelect } from './MultiSelect';

const ALL_STATUSES: AnimeStatus[] = ['Watching', 'Completed', 'PlanToWatch', 'OnHold', 'Dropped'];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'score',       label: 'Rating' },
  { value: 'title',       label: 'Title' },
  { value: 'releaseDate', label: 'Release' },
];

const STATUS_DOTS: Record<AnimeStatus, string> = {
  Watching:    'bg-indigo-500',
  Completed:   'bg-emerald-500',
  PlanToWatch: 'bg-sky-500',
  OnHold:      'bg-amber-500',
  Dropped:     'bg-rose-500',
};

interface Props {
  filters: AnimeFilters;
  genres: string[];
  onChange: (filters: AnimeFilters) => void;
}

export function AnimeFilter({ filters, genres, onChange }: Props) {
  const toggleSortDir = () => onChange({ ...filters, sortDesc: !filters.sortDesc });
  const hasActiveFilters = filters.status || filters.genres?.length || filters.search;

  return (
    <div className="space-y-3">

      {/* Search bar */}
      <div className="relative w-full sm:max-w-sm">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="7" strokeWidth={2} />
          <path strokeLinecap="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search titles…"
          value={filters.search ?? ''}
          onChange={e => onChange({ ...filters, search: e.target.value || undefined })}
          className="w-full h-10 pl-10 pr-9 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all duration-200 shadow-sm"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: undefined })}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-1.5 flex-wrap">

        {/* Status chips */}
        <button
          onClick={() => onChange({ ...filters, status: undefined })}
          className={`h-8 px-3 rounded-lg text-xs font-medium transition-all duration-150 ${
            !filters.status
              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10'
          }`}
        >
          All
        </button>

        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => onChange({ ...filters, status: filters.status === s ? undefined : s })}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all duration-150 ${
              filters.status === s
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOTS[s]}`} />
            {STATUS_LABELS[s]}
          </button>
        ))}

        {/* Separator */}
        <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 mx-1 shrink-0" />

        {/* Genre */}
        {genres.length > 0 && (
          <MultiSelect
            options={genres}
            selected={filters.genres ?? []}
            placeholder="Genres"
            onChange={selected => onChange({ ...filters, genres: selected.length ? selected : undefined })}
          />
        )}

        {/* Sort */}
        <div className="flex items-center gap-1 ml-auto">
          <div className="relative">
            <select
              value={filters.sortBy ?? 'score'}
              onChange={e => onChange({ ...filters, sortBy: e.target.value as SortBy })}
              className="h-8 appearance-none text-xs border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-zinc-600 dark:text-zinc-300 rounded-lg pl-2.5 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <button
            onClick={toggleSortDir}
            title={filters.sortDesc ? 'Descending' : 'Ascending'}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {filters.sortDesc
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14M19 12l-7 7-7-7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5M5 12l7-7 7 7" />
              }
            </svg>
          </button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => onChange({ sortBy: filters.sortBy, sortDesc: filters.sortDesc })}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-150"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

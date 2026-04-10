import type { AnimeFilters, AnimeStatus, SortBy } from '../types/anime';
import { STATUS_LABELS } from '../types/anime';
import { MultiSelect } from './MultiSelect';

const ALL_STATUSES: AnimeStatus[] = ['Watching', 'Completed', 'PlanToWatch', 'OnHold', 'Dropped'];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'title',       label: 'Title' },
  { value: 'score',       label: 'Rating' },
  { value: 'releaseDate', label: 'Release Date' },
];

interface Props {
  filters: AnimeFilters;
  genres: string[];
  onChange: (filters: AnimeFilters) => void;
}

export function AnimeFilter({ filters, genres, onChange }: Props) {
  const toggleSortDir = () => onChange({ ...filters, sortDesc: !filters.sortDesc });
  const hasActiveFilters = filters.status || filters.genres?.length || filters.search;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">⌕</span>
        <input
          type="text"
          placeholder="Search…"
          value={filters.search ?? ''}
          onChange={e => onChange({ ...filters, search: e.target.value || undefined })}
          className={inputCls + ' pl-8 w-44'}
        />
      </div>

      {/* Status */}
      <select
        value={filters.status ?? ''}
        onChange={e => onChange({ ...filters, status: (e.target.value as AnimeStatus) || undefined })}
        className={inputCls}
      >
        <option value="">All Statuses</option>
        {ALL_STATUSES.map(s => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      {/* Genres */}
      <MultiSelect
        options={genres}
        selected={filters.genres ?? []}
        placeholder="All Genres"
        onChange={selected => onChange({ ...filters, genres: selected.length ? selected : undefined })}
      />

      <div className="w-px h-5 bg-zinc-200 dark:bg-white/10" />

      {/* Sort */}
      <div className="flex items-center gap-1">
        <select
          value={filters.sortBy ?? 'score'}
          onChange={e => onChange({ ...filters, sortBy: e.target.value as SortBy })}
          className={inputCls}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={toggleSortDir}
          title={filters.sortDesc ? 'Descending' : 'Ascending'}
          className={inputCls + ' w-9 px-0 text-center font-bold'}
        >
          {filters.sortDesc ? '↓' : '↑'}
        </button>
      </div>

      {hasActiveFilters && (
        <button
          onClick={() => onChange({ sortBy: filters.sortBy, sortDesc: filters.sortDesc })}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-150"
        >
          Clear
        </button>
      )}
    </div>
  );
}

const inputCls = 'border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-150 placeholder-zinc-400 dark:placeholder-zinc-600';

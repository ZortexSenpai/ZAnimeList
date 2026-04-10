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
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="text"
        placeholder="Search anime..."
        value={filters.search ?? ''}
        onChange={e => onChange({ ...filters, search: e.target.value || undefined })}
        className={selectCls + ' w-52'}
      />

      <select
        value={filters.status ?? ''}
        onChange={e => onChange({ ...filters, status: (e.target.value as AnimeStatus) || undefined })}
        className={selectCls}
      >
        <option value="">All Statuses</option>
        {ALL_STATUSES.map(s => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      <MultiSelect
        options={genres}
        selected={filters.genres ?? []}
        placeholder="All Genres"
        onChange={selected => onChange({ ...filters, genres: selected.length ? selected : undefined })}
      />

      <span className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      <div className="flex items-center gap-1">
        <select
          value={filters.sortBy ?? 'title'}
          onChange={e => onChange({ ...filters, sortBy: e.target.value as SortBy })}
          className={selectCls}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={toggleSortDir}
          title={filters.sortDesc ? 'Descending' : 'Ascending'}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          {filters.sortDesc ? '↓' : '↑'}
        </button>
      </div>

      {hasActiveFilters && (
        <button
          onClick={() => onChange({ sortBy: filters.sortBy, sortDesc: filters.sortDesc })}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

const selectCls = 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

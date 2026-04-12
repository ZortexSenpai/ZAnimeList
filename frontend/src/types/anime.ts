export type AnimeStatus = 'Watching' | 'Completed' | 'PlanToWatch' | 'OnHold' | 'Dropped';

export interface Anime {
  id: number;
  title: string;
  titleEnglish: string | null;
  synopsis: string | null;
  coverImageUrl: string | null;
  totalEpisodes: number | null;
  episodesWatched: number;
  status: AnimeStatus;
  score: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  airedFrom: string | null;
  malId: number | null;
  anilistId: number | null;
  createdAt: string;
  updatedAt: string;
  genres: string[];
}

export interface CreateAnime {
  title: string;
  titleEnglish?: string;
  synopsis?: string;
  coverImageUrl?: string;
  totalEpisodes?: number;
  episodesWatched: number;
  status: AnimeStatus;
  score?: number;
  startedAt?: string;
  finishedAt?: string;
  malId?: number;
  anilistId?: number;
  genres: string[];
}

export interface UpdateAnime {
  title?: string;
  titleEnglish?: string;
  synopsis?: string;
  coverImageUrl?: string;
  totalEpisodes?: number;
  episodesWatched?: number;
  status?: AnimeStatus;
  score?: number;
  startedAt?: string;
  finishedAt?: string;
  genres?: string[];
}

export type SortBy = 'title' | 'score' | 'releaseDate';

export interface AnimeFilters {
  status?: AnimeStatus;
  genres?: string[];
  search?: string;
  sortBy?: SortBy;
  sortDesc?: boolean;
}

export const STATUS_LABELS: Record<AnimeStatus, string> = {
  Watching: 'Watching',
  Completed: 'Completed',
  PlanToWatch: 'Plan to Watch',
  OnHold: 'On Hold',
  Dropped: 'Dropped',
};

// Designed for dark overlay backgrounds (image cards)
export const STATUS_COLORS: Record<AnimeStatus, string> = {
  Watching:    'bg-sky-500/20 text-sky-300 ring-1 ring-inset ring-sky-500/40',
  Completed:   'bg-emerald-500/20 text-emerald-300 ring-1 ring-inset ring-emerald-500/40',
  PlanToWatch: 'bg-violet-500/20 text-violet-300 ring-1 ring-inset ring-violet-500/40',
  OnHold:      'bg-amber-500/20 text-amber-300 ring-1 ring-inset ring-amber-500/40',
  Dropped:     'bg-rose-500/20 text-rose-300 ring-1 ring-inset ring-rose-500/40',
};

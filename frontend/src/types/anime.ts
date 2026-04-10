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

export const STATUS_COLORS: Record<AnimeStatus, string> = {
  Watching: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PlanToWatch: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  OnHold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Dropped: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

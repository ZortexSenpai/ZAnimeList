export interface WatchActivity {
  id: number;
  userAnimeId: number | null;
  anilistActivityId: number;
  anilistMediaId: number | null;
  mediaTitle: string;
  status: string;
  progress: string | null;
  createdAt: string;
}

export interface ActivityStats {
  totalEpisodesWatched: number;
  uniqueTitles: number;
  currentStreak: number;
  longestStreak: number;
  hourDistribution: number[];  // 24 elements, UTC hour
  dayDistribution: number[];   // 7 elements, 0=Sun..6=Sat
  monthlyActivity: { year: number; month: number; count: number }[];  // 12 elements
  topAnime: { title: string; count: number }[];
}

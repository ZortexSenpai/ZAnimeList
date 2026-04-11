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

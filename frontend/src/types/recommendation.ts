export interface RewatchRecommendation {
  userAnimeId: number;
  title: string;
  titleEnglish: string | null;
  coverImageUrl: string | null;
  score: number;
  totalEpisodes: number | null;
  episodesWatched: number;
  lastWatchedAt: string;
  daysSinceLastWatch: number;
  recommendationScore: number;
}

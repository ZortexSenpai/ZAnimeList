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

export interface RecommendableUser {
  userId: number;
  username: string;
  avatarUrl: string | null;
  recommendationCount: number;
}

export interface UserBasedRecommendation {
  animeId: number;
  title: string;
  titleEnglish: string | null;
  coverImageUrl: string | null;
  totalEpisodes: number | null;
  recommenderScore: number;
  genres: string[];
  isInPlanToWatch: boolean;
}

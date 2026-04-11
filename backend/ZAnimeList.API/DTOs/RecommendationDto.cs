namespace ZAnimeList.API.DTOs;

public record RewatchRecommendationDto(
    int UserAnimeId,
    string Title,
    string? TitleEnglish,
    string? CoverImageUrl,
    int Score,
    int? TotalEpisodes,
    int EpisodesWatched,
    DateTime? LastWatchedAt,
    int DaysSinceLastWatch,
    double RecommendationScore
);

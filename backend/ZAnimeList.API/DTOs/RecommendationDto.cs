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

public record RecommendableUserDto(
    int UserId,
    string Username,
    bool HasProfilePicture,
    int RecommendationCount
);

public record UserBasedRecommendationDto(
    int AnimeId,
    string Title,
    string? TitleEnglish,
    string? CoverImageUrl,
    int? TotalEpisodes,
    int RecommenderScore,
    IEnumerable<string> Genres
);

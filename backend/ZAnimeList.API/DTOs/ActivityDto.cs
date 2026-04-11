namespace ZAnimeList.API.DTOs;

public record WatchActivityDto(
    int Id,
    int? UserAnimeId,
    long AnilistActivityId,
    int? AnilistMediaId,
    string MediaTitle,
    string Status,
    string? Progress,
    DateTime CreatedAt
);

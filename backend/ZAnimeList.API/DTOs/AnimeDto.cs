using ZAnimeList.API.Models;

namespace ZAnimeList.API.DTOs;

public record AnimeDto(
    int Id,
    string Title,
    string? TitleEnglish,
    string? Synopsis,
    string? CoverImageUrl,
    int? TotalEpisodes,
    int EpisodesWatched,
    AnimeStatus Status,
    int? Score,
    DateTime? StartedAt,
    DateTime? FinishedAt,
    DateTime? AiredFrom,
    int? MalId,
    int? AnilistId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<string> Genres
);

public record CreateAnimeDto(
    string Title,
    string? TitleEnglish,
    string? Synopsis,
    string? CoverImageUrl,
    int? TotalEpisodes,
    int EpisodesWatched,
    AnimeStatus Status,
    int? Score,
    DateTime? StartedAt,
    DateTime? FinishedAt,
    DateTime? AiredFrom,
    int? MalId,
    int? AnilistId,
    List<string> Genres
);

public record UpdateAnimeDto(
    string? Title,
    string? TitleEnglish,
    string? Synopsis,
    string? CoverImageUrl,
    int? TotalEpisodes,
    int? EpisodesWatched,
    AnimeStatus? Status,
    int? Score,
    DateTime? StartedAt,
    DateTime? FinishedAt,
    DateTime? AiredFrom,
    List<string>? Genres
);

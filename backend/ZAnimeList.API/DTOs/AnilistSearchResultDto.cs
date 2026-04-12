namespace ZAnimeList.API.DTOs;

public record AnilistSearchResultDto(
    int AnilistId,
    int? MalId,
    string Title,
    string? TitleEnglish,
    string? Synopsis,
    string? CoverImageUrl,
    int? TotalEpisodes,
    string[] Genres
);

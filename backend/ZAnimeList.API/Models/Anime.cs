namespace ZAnimeList.API.Models;

public class Anime
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? TitleEnglish { get; set; }
    public string? Synopsis { get; set; }
    public string? CoverImageUrl { get; set; }
    public byte[]? CoverImageData { get; set; }
    public string? CoverImageMimeType { get; set; }
    public int? TotalEpisodes { get; set; }
    public DateTime? AiredFrom { get; set; }
    public int? MalId { get; set; }
    public int? AnilistId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<AnimeGenre> AnimeGenres { get; set; } = [];
    public List<UserAnime> UserAnimes { get; set; } = [];
}

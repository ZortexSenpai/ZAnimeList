namespace ZAnimeList.API.Models;

public class Genre
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public List<AnimeGenre> AnimeGenres { get; set; } = [];
}

namespace ZAnimeList.API.Models;

public class UserAnime
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int AnimeId { get; set; }
    public AnimeStatus Status { get; set; } = AnimeStatus.PlanToWatch;
    public int? Score { get; set; }
    public int EpisodesWatched { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Anime Anime { get; set; } = null!;
}

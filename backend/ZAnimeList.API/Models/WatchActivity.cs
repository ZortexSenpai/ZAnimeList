namespace ZAnimeList.API.Models;

public class WatchActivity
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? UserAnimeId { get; set; }
    public long AnilistActivityId { get; set; }
    public int? AnilistMediaId { get; set; }
    public string MediaTitle { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Progress { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}

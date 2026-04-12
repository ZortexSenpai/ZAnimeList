namespace ZAnimeList.API.Models;

public class AppSettings
{
    public int Id { get; set; }
    public ImageSource ImageSource { get; set; } = ImageSource.Local;
    public string? AutoSyncInterval { get; set; }  // null = disabled; values: 15min 30min 1h 6h 1d 1week
    public DateTime? LastAutoSync { get; set; }
}

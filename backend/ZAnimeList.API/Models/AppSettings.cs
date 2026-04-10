namespace ZAnimeList.API.Models;

public class AppSettings
{
    public int Id { get; set; }
    public ImageSource ImageSource { get; set; } = ImageSource.Local;
}

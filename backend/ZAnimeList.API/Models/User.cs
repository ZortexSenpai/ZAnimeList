namespace ZAnimeList.API.Models;

public enum UserRole { User, Admin }

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public string? AnilistUsername { get; set; }
    public string? MalUsername { get; set; }
    public string Theme { get; set; } = "System";
    public byte[]? ProfilePictureData { get; set; }
    public string? ProfilePictureMimeType { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // OIDC / external auth fields
    public string? ExternalId { get; set; }   // Subject claim from OIDC provider
    public string? AuthProvider { get; set; } // "oidc" or null for local accounts

    public List<UserAnime> UserAnimes { get; set; } = [];
}

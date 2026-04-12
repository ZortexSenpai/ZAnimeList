using ZAnimeList.API.Models;

namespace ZAnimeList.API.DTOs;

public record LoginRequest(string Username, string Password);

public record RegisterRequest(string Username, string Password, UserRole Role = UserRole.User);

public record TokenResponse(string Token, UserDto User);

public record UserDto(int Id, string Username, UserRole Role, string? AnilistUsername, string? MalUsername, string Theme, DateTime CreatedAt, string? BannerImageUrl, string? AnilistAvatarUrl);

public record UpdateProfileRequest(string? AnilistUsername, string? MalUsername, string Theme);

public record OidcCallbackRequest(string Code, string CodeVerifier);
public record AuthorizeUrlResponse(string Url);
public record OidcConfigResponse(bool Enabled, string? DisplayName);

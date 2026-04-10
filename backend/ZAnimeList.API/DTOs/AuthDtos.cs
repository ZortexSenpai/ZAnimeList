using ZAnimeList.API.Models;

namespace ZAnimeList.API.DTOs;

public record LoginRequest(string Username, string Password);

public record RegisterRequest(string Username, string Password, UserRole Role = UserRole.User);

public record TokenResponse(string Token, UserDto User);

public record UserDto(int Id, string Username, UserRole Role);

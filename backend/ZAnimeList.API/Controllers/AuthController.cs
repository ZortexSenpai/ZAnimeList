using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ZAnimeList.API.Data;
using ZAnimeList.API.DTOs;
using ZAnimeList.API.Models;
using ZAnimeList.API.Services;

namespace ZAnimeList.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<TokenResponse>> Login(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);
        if (user is null || !PasswordHasher.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid username or password." });

        return Ok(new TokenResponse(GenerateToken(user), ToDto(user)));
    }

    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register(RegisterRequest req)
    {
        // Only admins can create admin accounts
        if (req.Role == UserRole.Admin && !User.IsInRole("Admin"))
            return Forbid();

        if (await db.Users.AnyAsync(u => u.Username == req.Username))
            return Conflict(new { message = "Username already taken." });

        var user = new User
        {
            Username = req.Username,
            PasswordHash = PasswordHasher.Hash(req.Password),
            Role = req.Role,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Created(string.Empty, ToDto(user));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();
        return Ok(ToDto(user));
    }

    [HttpGet("users/{id:int}")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetUser(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();
        return Ok(ToDto(user));
    }

    [HttpGet("users")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
    {
        var users = await db.Users.ToListAsync();
        return Ok(users.Select(ToDto));
    }

    [HttpDelete("users/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        if (id == GetUserId())
            return BadRequest(new { message = "Cannot delete your own account." });

        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateProfile(UpdateProfileRequest req)
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        var validThemes = new[] { "System", "Light", "Dark", "OLED", "Sepia", "Midnight", "Nord", "Dracula", "Rose", "Mint" };
        if (!validThemes.Contains(req.Theme))
            return BadRequest(new { message = "Invalid theme value." });

        user.AnilistUsername = string.IsNullOrWhiteSpace(req.AnilistUsername) ? null : req.AnilistUsername.Trim();
        user.MalUsername = string.IsNullOrWhiteSpace(req.MalUsername) ? null : req.MalUsername.Trim();
        user.Theme = req.Theme;

        await db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static UserDto ToDto(User user) =>
        new(user.Id, user.Username, user.Role, user.AnilistUsername, user.MalUsername, user.Theme, user.CreatedAt, user.BannerImageUrl, user.AnilistAvatarUrl);

    private string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

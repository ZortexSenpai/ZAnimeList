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

        return Ok(new TokenResponse(GenerateToken(user), new UserDto(user.Id, user.Username, user.Role)));
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

        return Created(string.Empty, new UserDto(user.Id, user.Username, user.Role));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();
        return Ok(new UserDto(user.Id, user.Username, user.Role));
    }

    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
    {
        var users = await db.Users
            .Select(u => new UserDto(u.Id, u.Username, u.Role))
            .ToListAsync();
        return Ok(users);
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

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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

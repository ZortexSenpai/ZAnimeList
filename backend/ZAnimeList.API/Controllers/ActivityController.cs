using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZAnimeList.API.Data;
using ZAnimeList.API.DTOs;

namespace ZAnimeList.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ActivityController(AppDbContext db) : ControllerBase
{
    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WatchActivityDto>>> GetAll(
        [FromQuery] int? userAnimeId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        var userId = GetUserId();
        var query = db.WatchActivities
            .Where(wa => wa.UserId == userId)
            .AsQueryable();

        if (userAnimeId.HasValue)
            query = query.Where(wa => wa.UserAnimeId == userAnimeId);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(wa => wa.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(wa => new WatchActivityDto(
                wa.Id, wa.UserAnimeId, wa.AnilistActivityId, wa.AnilistMediaId,
                wa.MediaTitle, wa.Status, wa.Progress, wa.CreatedAt))
            .ToListAsync();

        Response.Headers["X-Total-Count"] = total.ToString();
        return Ok(items);
    }
}

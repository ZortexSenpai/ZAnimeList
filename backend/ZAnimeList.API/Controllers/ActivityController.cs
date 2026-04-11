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

    [HttpGet("stats")]
    public async Task<ActionResult<ActivityStatsDto>> GetStats()
    {
        var userId = GetUserId();

        var activities = await db.WatchActivities
            .Where(wa => wa.UserId == userId)
            .Select(wa => new { wa.Status, wa.MediaTitle, wa.CreatedAt })
            .ToListAsync();

        var episodeActivities = activities
            .Where(a => a.Status == "watched episode" || a.Status == "rewatched episode")
            .ToList();

        // Hour / day distributions
        var hourDist = new int[24];
        var dayDist = new int[7];
        foreach (var a in episodeActivities)
        {
            hourDist[a.CreatedAt.Hour]++;
            dayDist[(int)a.CreatedAt.DayOfWeek]++;
        }

        // Unique titles
        var uniqueTitles = episodeActivities.Select(a => a.MediaTitle).Distinct().Count();

        // Streaks — work on UTC calendar dates
        var dates = episodeActivities
            .Select(a => a.CreatedAt.Date)
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        var today = DateTime.UtcNow.Date;
        int currentStreak = 0;
        var checkDate = dates.Contains(today) ? today : today.AddDays(-1);
        while (dates.Contains(checkDate))
        {
            currentStreak++;
            checkDate = checkDate.AddDays(-1);
        }

        int longestStreak = 0, runStreak = 0;
        DateTime? prev = null;
        foreach (var d in dates)
        {
            runStreak = (prev.HasValue && (d - prev.Value).TotalDays == 1) ? runStreak + 1 : 1;
            if (runStreak > longestStreak) longestStreak = runStreak;
            prev = d;
        }

        // Monthly activity — last 12 months
        var monthStart = new DateTime(today.Year, today.Month, 1).AddMonths(-11);
        var monthlyGroups = episodeActivities
            .Where(a => a.CreatedAt >= monthStart)
            .GroupBy(a => new { a.CreatedAt.Year, a.CreatedAt.Month })
            .ToDictionary(g => (g.Key.Year, g.Key.Month), g => g.Count());

        var monthlyActivity = Enumerable.Range(0, 12)
            .Select(i =>
            {
                var d = monthStart.AddMonths(i);
                monthlyGroups.TryGetValue((d.Year, d.Month), out var count);
                return new MonthlyCountDto(d.Year, d.Month, count);
            })
            .ToArray();

        // Top anime
        var topAnime = episodeActivities
            .GroupBy(a => a.MediaTitle)
            .OrderByDescending(g => g.Count())
            .Take(5)
            .Select(g => new TopAnimeEntryDto(g.Key, g.Count()))
            .ToArray();

        return Ok(new ActivityStatsDto(
            episodeActivities.Count, uniqueTitles,
            currentStreak, longestStreak,
            hourDist, dayDist, monthlyActivity, topAnime));
    }
}

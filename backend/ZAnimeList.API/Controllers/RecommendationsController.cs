using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZAnimeList.API.Data;
using ZAnimeList.API.DTOs;
using ZAnimeList.API.Models;

namespace ZAnimeList.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecommendationsController(AppDbContext db) : ControllerBase
{
    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("rewatch")]
    public async Task<ActionResult<IEnumerable<RewatchRecommendationDto>>> GetRewatchRecommendations()
    {
        var userId = GetUserId();

        var userAnimes = await db.UserAnimes
            .Where(ua => ua.UserId == userId
                      && (ua.Status == AnimeStatus.Completed || ua.Status == AnimeStatus.OnHold)
                      && ua.Score.HasValue && ua.Score > 0)
            .Select(ua => new
            {
                ua.Id,
                ua.Anime.Title,
                ua.Anime.TitleEnglish,
                ua.Anime.CoverImageUrl,
                HasLocalImage = ua.Anime.CoverImageData != null,
                Score = ua.Score!.Value,
                ua.Anime.TotalEpisodes,
                ua.EpisodesWatched,
                ua.FinishedAt,
                ua.UpdatedAt,
                ua.Anime.AnilistId,
            })
            .ToListAsync();

        // Most recent episode-watch activity per AniList media ID
        var lastActivityByMediaId = await db.WatchActivities
            .Where(wa => wa.UserId == userId
                      && wa.AnilistMediaId.HasValue
                      && (wa.Status == "watched episode" || wa.Status == "rewatched episode"))
            .GroupBy(wa => wa.AnilistMediaId!.Value)
            .Select(g => new { MediaId = g.Key, LastAt = g.Max(wa => wa.CreatedAt) })
            .ToDictionaryAsync(x => x.MediaId, x => x.LastAt);

        var today = DateTime.UtcNow.Date;
        var results = new List<RewatchRecommendationDto>(userAnimes.Count);

        foreach (var ua in userAnimes)
        {
            // Resolve the most accurate "last watched" date
            DateTime lastWatchedAt;
            if (ua.AnilistId.HasValue && lastActivityByMediaId.TryGetValue(ua.AnilistId.Value, out var actDate))
                lastWatchedAt = actDate;
            else if (ua.FinishedAt.HasValue)
                lastWatchedAt = ua.FinishedAt.Value;
            else
                lastWatchedAt = ua.UpdatedAt;

            var daysSince = Math.Max(0, (int)(today - lastWatchedAt.Date).TotalDays);

            // score = userRating × log₂(daysSince + 2)
            // Longer gap and higher rating both push the score up.
            var recScore = Math.Round(ua.Score * Math.Log(daysSince + 2, 2), 2);

            var coverUrl = ua.HasLocalImage ? $"/api/anime/{ua.Id}/image" : ua.CoverImageUrl;

            results.Add(new RewatchRecommendationDto(
                ua.Id, ua.Title, ua.TitleEnglish, coverUrl,
                ua.Score, ua.TotalEpisodes, ua.EpisodesWatched,
                lastWatchedAt, daysSince, recScore));
        }

        return Ok(results.OrderByDescending(r => r.RecommendationScore));
    }

    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<RecommendableUserDto>>> GetRecommendableUsers()
    {
        var userId = GetUserId();

        var users = await db.Users
            .Where(u => u.Id != userId)
            .Select(u => new
            {
                u.Id,
                u.Username,
                AvatarUrl = u.AnilistAvatarUrl,
                RecommendationCount = u.UserAnimes.Count(ua =>
                    ua.Score.HasValue && ua.Score >= 7 &&
                    !db.UserAnimes.Any(mua => mua.UserId == userId && mua.AnimeId == ua.AnimeId && mua.Status != AnimeStatus.PlanToWatch))
            })
            .OrderByDescending(u => u.RecommendationCount)
            .ToListAsync();

        return Ok(users.Select(u => new RecommendableUserDto(u.Id, u.Username, u.AvatarUrl, u.RecommendationCount)));
    }

    [HttpGet("users/{targetUserId:int}")]
    public async Task<ActionResult<IEnumerable<UserBasedRecommendationDto>>> GetUserRecommendations(int targetUserId)
    {
        var userId = GetUserId();

        if (targetUserId == userId)
            return BadRequest(new { message = "Cannot get recommendations from yourself." });

        var recs = await db.UserAnimes
            .Where(ua => ua.UserId == targetUserId &&
                         ua.Score.HasValue && ua.Score > 0 &&
                         !db.UserAnimes.Any(mua => mua.UserId == userId && mua.AnimeId == ua.AnimeId && mua.Status != AnimeStatus.PlanToWatch))
            .Select(ua => new
            {
                ua.AnimeId,
                ua.Id,
                ua.Anime.Title,
                ua.Anime.TitleEnglish,
                ua.Anime.CoverImageUrl,
                HasLocalImage = ua.Anime.CoverImageData != null,
                ua.Anime.TotalEpisodes,
                Score = ua.Score!.Value,
                Genres = ua.Anime.AnimeGenres.Select(ag => ag.Genre.Name),
                IsInPlanToWatch = db.UserAnimes.Any(mua => mua.UserId == userId && mua.AnimeId == ua.AnimeId && mua.Status == AnimeStatus.PlanToWatch),
            })
            .OrderByDescending(x => x.IsInPlanToWatch)
            .ThenByDescending(x => x.Score)
            .ToListAsync();

        return Ok(recs.Select(r => new UserBasedRecommendationDto(
            r.AnimeId,
            r.Title,
            r.TitleEnglish,
            r.HasLocalImage ? $"/api/anime/{r.Id}/image" : r.CoverImageUrl,
            r.TotalEpisodes,
            r.Score,
            r.Genres,
            r.IsInPlanToWatch
        )));
    }
}

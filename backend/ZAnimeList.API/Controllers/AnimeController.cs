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
public class AnimeController(AppDbContext db) : ControllerBase
{
    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AnimeDto>>> GetAll(
        [FromQuery] AnimeStatus? status,
        [FromQuery] string[]? genres,
        [FromQuery] string? search,
        [FromQuery] string? sortBy,
        [FromQuery] bool sortDesc = false)
    {
        var userId = GetUserId();
        var query = db.UserAnimes
            .Where(ua => ua.UserId == userId)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(ua => ua.Status == status.Value);

        if (genres is { Length: > 0 })
            query = query.Where(ua => genres.All(g => ua.Anime.AnimeGenres.Any(ag => ag.Genre.Name == g)));

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(ua => ua.Anime.Title.Contains(search) || (ua.Anime.TitleEnglish != null && ua.Anime.TitleEnglish.Contains(search)));

        query = sortBy switch
        {
            "score"       => sortDesc ? query.OrderByDescending(ua => ua.Score) : query.OrderBy(ua => ua.Score),
            "releaseDate" => sortDesc ? query.OrderByDescending(ua => ua.Anime.AiredFrom) : query.OrderBy(ua => ua.Anime.AiredFrom),
            _             => sortDesc ? query.OrderByDescending(ua => ua.Anime.Title) : query.OrderBy(ua => ua.Anime.Title),
        };

        var entries = await query
            .Select(ua => new
            {
                ua.Id,
                ua.Anime.Title, ua.Anime.TitleEnglish, ua.Anime.Synopsis,
                ua.Anime.CoverImageUrl,
                ua.Anime.TotalEpisodes,
                ua.EpisodesWatched, ua.Status, ua.Score,
                ua.StartedAt, ua.FinishedAt,
                ua.Anime.AiredFrom, ua.Anime.MalId, ua.Anime.AnilistId,
                ua.CreatedAt, ua.UpdatedAt,
                HasImage = ua.Anime.CoverImageData != null,
                Genres = ua.Anime.AnimeGenres.Select(ag => ag.Genre.Name).ToList()
            })
            .ToListAsync();

        return Ok(entries.Select(ua => new AnimeDto(
            ua.Id, ua.Title, ua.TitleEnglish, ua.Synopsis,
            ua.HasImage ? $"/api/anime/{ua.Id}/image" : ua.CoverImageUrl,
            ua.TotalEpisodes, ua.EpisodesWatched, ua.Status, ua.Score,
            ua.StartedAt, ua.FinishedAt, ua.AiredFrom, ua.MalId, ua.AnilistId,
            ua.CreatedAt, ua.UpdatedAt, ua.Genres
        )));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AnimeDto>> GetById(int id)
    {
        var userId = GetUserId();
        var ua = await db.UserAnimes
            .Where(ua => ua.Id == id && ua.UserId == userId)
            .Select(ua => new
            {
                ua.Id,
                ua.Anime.Title, ua.Anime.TitleEnglish, ua.Anime.Synopsis,
                ua.Anime.CoverImageUrl,
                ua.Anime.TotalEpisodes,
                ua.EpisodesWatched, ua.Status, ua.Score,
                ua.StartedAt, ua.FinishedAt,
                ua.Anime.AiredFrom, ua.Anime.MalId, ua.Anime.AnilistId,
                ua.CreatedAt, ua.UpdatedAt,
                HasImage = ua.Anime.CoverImageData != null,
                Genres = ua.Anime.AnimeGenres.Select(ag => ag.Genre.Name).ToList()
            })
            .FirstOrDefaultAsync();

        if (ua is null) return NotFound();

        return Ok(new AnimeDto(
            ua.Id, ua.Title, ua.TitleEnglish, ua.Synopsis,
            ua.HasImage ? $"/api/anime/{ua.Id}/image" : ua.CoverImageUrl,
            ua.TotalEpisodes, ua.EpisodesWatched, ua.Status, ua.Score,
            ua.StartedAt, ua.FinishedAt, ua.AiredFrom, ua.MalId, ua.AnilistId,
            ua.CreatedAt, ua.UpdatedAt, ua.Genres
        ));
    }

    [HttpGet("{id:int}/image")]
    [AllowAnonymous]
    public async Task<IActionResult> GetImage(int id)
    {
        var entry = await db.UserAnimes
            .Where(ua => ua.Id == id)
            .Select(ua => new { ua.Anime.CoverImageData, ua.Anime.CoverImageMimeType })
            .FirstOrDefaultAsync();

        if (entry?.CoverImageData is null) return NotFound();
        return File(entry.CoverImageData, entry.CoverImageMimeType ?? "image/jpeg");
    }

    [HttpPost]
    public async Task<ActionResult<AnimeDto>> Create(CreateAnimeDto dto)
    {
        var userId = GetUserId();

        // Try to find an existing shared Anime by external ID
        Anime? anime = null;

        if (dto.AnilistId.HasValue)
            anime = await db.Animes.FirstOrDefaultAsync(a => a.AnilistId == dto.AnilistId);

        if (anime == null && dto.MalId.HasValue)
            anime = await db.Animes.FirstOrDefaultAsync(a => a.MalId == dto.MalId);

        if (anime != null)
        {
            // Anime already exists in the DB — check if this user already has it
            if (await db.UserAnimes.AnyAsync(ua => ua.AnimeId == anime.Id && ua.UserId == userId))
                return Conflict(new { message = $"\"{anime.Title}\" is already in your list." });
        }
        else
        {
            // No external ID match — check for title duplicate in the user's list
            if (!dto.AnilistId.HasValue && !dto.MalId.HasValue &&
                await db.UserAnimes.AnyAsync(ua => ua.UserId == userId && ua.Anime.Title == dto.Title))
                return Conflict(new { message = $"\"{dto.Title}\" is already in your list." });

            anime = new Anime
            {
                Title = dto.Title,
                TitleEnglish = dto.TitleEnglish,
                Synopsis = dto.Synopsis,
                CoverImageUrl = dto.CoverImageUrl,
                TotalEpisodes = dto.TotalEpisodes,
                AiredFrom = dto.AiredFrom,
                MalId = dto.MalId,
                AnilistId = dto.AnilistId,
            };
            await AttachGenres(anime, dto.Genres);
            db.Animes.Add(anime);
            await db.SaveChangesAsync();
        }

        var userAnime = new UserAnime
        {
            UserId = userId,
            AnimeId = anime.Id,
            Status = dto.Status,
            Score = dto.Score,
            EpisodesWatched = dto.EpisodesWatched,
            StartedAt = dto.StartedAt,
            FinishedAt = dto.FinishedAt,
        };

        db.UserAnimes.Add(userAnime);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = userAnime.Id }, await GetById(userAnime.Id));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AnimeDto>> Update(int id, UpdateAnimeDto dto)
    {
        var userId = GetUserId();
        var userAnime = await db.UserAnimes
            .Where(ua => ua.Id == id && ua.UserId == userId)
            .Include(ua => ua.Anime)
            .ThenInclude(a => a.AnimeGenres)
            .ThenInclude(ag => ag.Genre)
            .FirstOrDefaultAsync();

        if (userAnime is null) return NotFound();

        // Update tracking fields on UserAnime
        if (dto.Status.HasValue) userAnime.Status = dto.Status.Value;
        if (dto.Score.HasValue) userAnime.Score = dto.Score;
        if (dto.EpisodesWatched.HasValue) userAnime.EpisodesWatched = dto.EpisodesWatched.Value;
        if (dto.StartedAt.HasValue) userAnime.StartedAt = dto.StartedAt;
        if (dto.FinishedAt.HasValue) userAnime.FinishedAt = dto.FinishedAt;
        userAnime.UpdatedAt = DateTime.UtcNow;

        // Update metadata fields on the shared Anime
        var anime = userAnime.Anime;
        if (dto.Title is not null) anime.Title = dto.Title;
        if (dto.TitleEnglish is not null) anime.TitleEnglish = dto.TitleEnglish;
        if (dto.Synopsis is not null) anime.Synopsis = dto.Synopsis;
        if (dto.CoverImageUrl is not null) anime.CoverImageUrl = dto.CoverImageUrl;
        if (dto.TotalEpisodes.HasValue) anime.TotalEpisodes = dto.TotalEpisodes;
        if (dto.AiredFrom.HasValue) anime.AiredFrom = dto.AiredFrom;
        anime.UpdatedAt = DateTime.UtcNow;

        if (dto.Genres is not null)
        {
            anime.AnimeGenres.Clear();
            await AttachGenres(anime, dto.Genres);
        }

        await db.SaveChangesAsync();
        return await GetById(id);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        var userAnime = await db.UserAnimes.FirstOrDefaultAsync(ua => ua.Id == id && ua.UserId == userId);
        if (userAnime is null) return NotFound();

        db.UserAnimes.Remove(userAnime);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("genres")]
    public async Task<ActionResult<IEnumerable<string>>> GetGenres()
    {
        var userId = GetUserId();
        var genres = await db.Genres
            .Where(g => g.AnimeGenres.Any(ag => ag.Anime.UserAnimes.Any(ua => ua.UserId == userId)))
            .OrderBy(g => g.Name)
            .Select(g => g.Name)
            .ToListAsync();
        return Ok(genres);
    }

    private async Task AttachGenres(Anime anime, List<string> genreNames)
    {
        var distinctNames = genreNames.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var existing = await db.Genres
            .Where(g => distinctNames.Contains(g.Name))
            .ToDictionaryAsync(g => g.Name, StringComparer.OrdinalIgnoreCase);

        foreach (var name in distinctNames)
        {
            if (!existing.TryGetValue(name, out var genre))
            {
                genre = new Genre { Name = name };
                db.Genres.Add(genre);
                existing[name] = genre;
            }
            anime.AnimeGenres.Add(new AnimeGenre { Genre = genre });
        }
    }
}

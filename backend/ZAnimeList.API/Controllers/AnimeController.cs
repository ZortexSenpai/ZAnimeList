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
        var query = db.Animes
            .Where(a => a.UserId == userId)
            .Include(a => a.AnimeGenres)
            .ThenInclude(ag => ag.Genre)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(a => a.Status == status.Value);

        if (genres is { Length: > 0 })
            query = query.Where(a => genres.All(g => a.AnimeGenres.Any(ag => ag.Genre.Name == g)));

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(a => a.Title.Contains(search) || (a.TitleEnglish != null && a.TitleEnglish.Contains(search)));

        query = sortBy switch
        {
            "score"       => sortDesc ? query.OrderByDescending(a => a.Score) : query.OrderBy(a => a.Score),
            "releaseDate" => sortDesc ? query.OrderByDescending(a => a.AiredFrom) : query.OrderBy(a => a.AiredFrom),
            _             => sortDesc ? query.OrderByDescending(a => a.Title) : query.OrderBy(a => a.Title),
        };

        var animes = await query
            .Select(a => new
            {
                a.Id, a.Title, a.TitleEnglish, a.Synopsis, a.CoverImageUrl,
                a.TotalEpisodes, a.EpisodesWatched, a.Status, a.Score,
                a.StartedAt, a.FinishedAt, a.AiredFrom, a.MalId, a.AnilistId,
                a.CreatedAt, a.UpdatedAt,
                HasImage = a.CoverImageData != null,
                Genres = a.AnimeGenres.Select(ag => ag.Genre.Name).ToList()
            })
            .ToListAsync();

        return Ok(animes.Select(a => new AnimeDto(
            a.Id, a.Title, a.TitleEnglish, a.Synopsis,
            a.HasImage ? $"/api/anime/{a.Id}/image" : a.CoverImageUrl,
            a.TotalEpisodes, a.EpisodesWatched, a.Status, a.Score,
            a.StartedAt, a.FinishedAt, a.AiredFrom, a.MalId, a.AnilistId,
            a.CreatedAt, a.UpdatedAt, a.Genres
        )));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AnimeDto>> GetById(int id)
    {
        var userId = GetUserId();
        var anime = await db.Animes
            .Where(a => a.Id == id && a.UserId == userId)
            .Include(a => a.AnimeGenres)
            .ThenInclude(ag => ag.Genre)
            .Select(a => new
            {
                a.Id, a.Title, a.TitleEnglish, a.Synopsis, a.CoverImageUrl,
                a.TotalEpisodes, a.EpisodesWatched, a.Status, a.Score,
                a.StartedAt, a.FinishedAt, a.AiredFrom, a.MalId, a.AnilistId,
                a.CreatedAt, a.UpdatedAt,
                HasImage = a.CoverImageData != null,
                Genres = a.AnimeGenres.Select(ag => ag.Genre.Name).ToList()
            })
            .FirstOrDefaultAsync();

        if (anime is null) return NotFound();

        return Ok(new AnimeDto(
            anime.Id, anime.Title, anime.TitleEnglish, anime.Synopsis,
            anime.HasImage ? $"/api/anime/{anime.Id}/image" : anime.CoverImageUrl,
            anime.TotalEpisodes, anime.EpisodesWatched, anime.Status, anime.Score,
            anime.StartedAt, anime.FinishedAt, anime.AiredFrom, anime.MalId, anime.AnilistId,
            anime.CreatedAt, anime.UpdatedAt, anime.Genres
        ));
    }

    [HttpGet("{id:int}/image")]
    public async Task<IActionResult> GetImage(int id)
    {
        var userId = GetUserId();
        var anime = await db.Animes
            .Where(a => a.Id == id && a.UserId == userId)
            .Select(a => new { a.CoverImageData, a.CoverImageMimeType })
            .FirstOrDefaultAsync();

        if (anime?.CoverImageData is null) return NotFound();
        return File(anime.CoverImageData, anime.CoverImageMimeType ?? "image/jpeg");
    }

    [HttpPost]
    public async Task<ActionResult<AnimeDto>> Create(CreateAnimeDto dto)
    {
        var userId = GetUserId();

        if (dto.AnilistId.HasValue && await db.Animes.AnyAsync(a => a.AnilistId == dto.AnilistId && a.UserId == userId))
            return Conflict(new { message = $"An anime with AniList ID {dto.AnilistId} is already in your list." });

        if (dto.MalId.HasValue && await db.Animes.AnyAsync(a => a.MalId == dto.MalId && a.UserId == userId))
            return Conflict(new { message = $"An anime with MyAnimeList ID {dto.MalId} is already in your list." });

        if (await db.Animes.AnyAsync(a => a.Title == dto.Title && a.UserId == userId))
            return Conflict(new { message = $"\"{dto.Title}\" is already in your list." });

        var anime = new Anime
        {
            Title = dto.Title,
            TitleEnglish = dto.TitleEnglish,
            Synopsis = dto.Synopsis,
            CoverImageUrl = dto.CoverImageUrl,
            TotalEpisodes = dto.TotalEpisodes,
            EpisodesWatched = dto.EpisodesWatched,
            Status = dto.Status,
            Score = dto.Score,
            StartedAt = dto.StartedAt,
            FinishedAt = dto.FinishedAt,
            AiredFrom = dto.AiredFrom,
            MalId = dto.MalId,
            AnilistId = dto.AnilistId,
            UserId = userId,
        };

        await AttachGenres(anime, dto.Genres);
        db.Animes.Add(anime);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = anime.Id }, await GetById(anime.Id));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AnimeDto>> Update(int id, UpdateAnimeDto dto)
    {
        var userId = GetUserId();
        var anime = await db.Animes
            .Where(a => a.Id == id && a.UserId == userId)
            .Include(a => a.AnimeGenres)
            .ThenInclude(ag => ag.Genre)
            .FirstOrDefaultAsync();

        if (anime is null) return NotFound();

        if (dto.Title is not null) anime.Title = dto.Title;
        if (dto.TitleEnglish is not null) anime.TitleEnglish = dto.TitleEnglish;
        if (dto.Synopsis is not null) anime.Synopsis = dto.Synopsis;
        if (dto.CoverImageUrl is not null) anime.CoverImageUrl = dto.CoverImageUrl;
        if (dto.TotalEpisodes.HasValue) anime.TotalEpisodes = dto.TotalEpisodes;
        if (dto.EpisodesWatched.HasValue) anime.EpisodesWatched = dto.EpisodesWatched.Value;
        if (dto.Status.HasValue) anime.Status = dto.Status.Value;
        if (dto.Score.HasValue) anime.Score = dto.Score;
        if (dto.StartedAt.HasValue) anime.StartedAt = dto.StartedAt;
        if (dto.FinishedAt.HasValue) anime.FinishedAt = dto.FinishedAt;
        if (dto.AiredFrom.HasValue) anime.AiredFrom = dto.AiredFrom;

        if (dto.Genres is not null)
        {
            anime.AnimeGenres.Clear();
            await AttachGenres(anime, dto.Genres);
        }

        anime.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await GetById(id);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        var anime = await db.Animes.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (anime is null) return NotFound();

        db.Animes.Remove(anime);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("genres")]
    public async Task<ActionResult<IEnumerable<string>>> GetGenres()
    {
        var userId = GetUserId();
        var genres = await db.Genres
            .Where(g => g.AnimeGenres.Any(ag => ag.Anime.UserId == userId))
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

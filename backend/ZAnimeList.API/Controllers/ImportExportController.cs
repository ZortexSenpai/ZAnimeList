using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZAnimeList.API.Data;
using ZAnimeList.API.DTOs;
using ZAnimeList.API.Services;

namespace ZAnimeList.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ImportExportController(
    AppDbContext db,
    MalImportService malService,
    AnilistImportService anilistService) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task WriteProgress(ImportProgressDto p, CancellationToken ct) =>
        await Response.WriteAsync(JsonSerializer.Serialize(p, JsonOpts) + "\n", ct);

    // --- MAL ---

    [HttpPost("mal/import")]
    public async Task ImportMal(IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0)
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("File is empty.", ct);
            return;
        }

        Response.ContentType = "application/x-ndjson";
        Response.Headers.CacheControl = "no-cache";

        await using var stream = file.OpenReadStream();
        var result = await malService.ImportAsync(stream, GetUserId(), async p =>
        {
            await WriteProgress(p, ct);
            await Response.Body.FlushAsync(ct);
        });

        await Response.WriteAsync(JsonSerializer.Serialize(result, JsonOpts) + "\n", ct);
    }

    [HttpGet("mal/export")]
    public async Task<IActionResult> ExportMal()
    {
        var userId = GetUserId();
        var entries = await db.UserAnimes
            .Where(ua => ua.UserId == userId)
            .Include(ua => ua.Anime)
            .ToListAsync();
        var doc = malService.ExportAsync(entries);

        var bytes = Encoding.UTF8.GetBytes(doc.Declaration + Environment.NewLine + doc.ToString());
        return File(bytes, "application/xml", "animelist.xml");
    }

    // --- AniList ---

    [HttpPost("anilist/import/username")]
    public async Task ImportAnilistByUsername([FromQuery] string username, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("Username is required.", ct);
            return;
        }

        Response.ContentType = "application/x-ndjson";
        Response.Headers.CacheControl = "no-cache";

        var result = await anilistService.ImportByUsernameAsync(username, GetUserId(), async p =>
        {
            await WriteProgress(p, ct);
            await Response.Body.FlushAsync(ct);
        });

        await Response.WriteAsync(JsonSerializer.Serialize(result, JsonOpts) + "\n", ct);
    }

    [HttpPost("anilist/import/file")]
    public async Task ImportAnilistFile(IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0)
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("File is empty.", ct);
            return;
        }

        Response.ContentType = "application/x-ndjson";
        Response.Headers.CacheControl = "no-cache";

        await using var stream = file.OpenReadStream();
        var result = await anilistService.ImportFromJsonAsync(stream, GetUserId(), async p =>
        {
            await WriteProgress(p, ct);
            await Response.Body.FlushAsync(ct);
        });

        await Response.WriteAsync(JsonSerializer.Serialize(result, JsonOpts) + "\n", ct);
    }
}

using System.Security.Claims;
using System.Text;
using System.Xml.Linq;
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
    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // --- MAL ---

    [HttpPost("mal/import")]
    public async Task<ActionResult<MalImportResultDto>> ImportMal(IFormFile file)
    {
        if (file.Length == 0) return BadRequest("File is empty.");
        await using var stream = file.OpenReadStream();
        var result = await malService.ImportAsync(stream, GetUserId());
        return Ok(result);
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
    public async Task<ActionResult<AnilistImportResultDto>> ImportAnilistByUsername([FromQuery] string username)
    {
        if (string.IsNullOrWhiteSpace(username)) return BadRequest("Username is required.");
        var result = await anilistService.ImportByUsernameAsync(username, GetUserId());
        return Ok(result);
    }

    [HttpPost("anilist/import/file")]
    public async Task<ActionResult<AnilistImportResultDto>> ImportAnilistFile(IFormFile file)
    {
        if (file.Length == 0) return BadRequest("File is empty.");
        await using var stream = file.OpenReadStream();
        var result = await anilistService.ImportFromJsonAsync(stream, GetUserId());
        return Ok(result);
    }
}

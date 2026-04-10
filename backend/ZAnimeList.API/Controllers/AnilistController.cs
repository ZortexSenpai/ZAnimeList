using Microsoft.AspNetCore.Mvc;
using ZAnimeList.API.Services;

namespace ZAnimeList.API.Controllers;

[ApiController]
[Route("api/anilist")]
public class AnilistController(AnilistImportService anilistService) : ControllerBase
{
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(Array.Empty<object>());

        var results = await anilistService.SearchAsync(q);
        return Ok(results);
    }
}

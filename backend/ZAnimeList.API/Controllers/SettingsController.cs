using Microsoft.AspNetCore.Mvc;
using ZAnimeList.API.Data;
using ZAnimeList.API.DTOs;
using ZAnimeList.API.Models;

namespace ZAnimeList.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<SettingsDto>> Get()
    {
        var settings = await db.Settings.FindAsync(1);
        return Ok(new SettingsDto((settings ?? new AppSettings()).ImageSource.ToString()));
    }

    [HttpPut]
    public async Task<ActionResult<SettingsDto>> Update(SettingsDto dto)
    {
        if (!Enum.TryParse<ImageSource>(dto.ImageSource, out var source))
            return BadRequest("Invalid ImageSource value.");

        var settings = await db.Settings.FindAsync(1);
        if (settings is null)
        {
            settings = new AppSettings { Id = 1 };
            db.Settings.Add(settings);
        }

        settings.ImageSource = source;
        await db.SaveChangesAsync();
        return Ok(new SettingsDto(settings.ImageSource.ToString()));
    }
}

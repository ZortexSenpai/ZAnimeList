using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ZAnimeList.API.Data;
using ZAnimeList.API.DTOs;
using ZAnimeList.API.Models;
using ZAnimeList.API.Services;

namespace ZAnimeList.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController(AppDbContext db) : ControllerBase
{
    private static readonly string[] ValidIntervals = ["15min", "30min", "1h", "6h", "1d", "1week"];

    [HttpGet]
    public async Task<ActionResult<SettingsDto>> Get()
    {
        var settings = await db.Settings.FindAsync(1);
        return Ok(ToDto(settings ?? new AppSettings()));
    }

    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<SettingsDto>> Update(SettingsDto dto)
    {
        if (!Enum.TryParse<ImageSource>(dto.ImageSource, out var source))
            return BadRequest("Invalid ImageSource value.");

        if (dto.AutoSyncInterval != null && !ValidIntervals.Contains(dto.AutoSyncInterval))
            return BadRequest("Invalid AutoSyncInterval value.");

        var settings = await db.Settings.FindAsync(1);
        if (settings is null)
        {
            settings = new AppSettings { Id = 1 };
            db.Settings.Add(settings);
        }

        settings.ImageSource = source;
        settings.AutoSyncInterval = dto.AutoSyncInterval;
        await db.SaveChangesAsync();
        return Ok(ToDto(settings));
    }

    private static SettingsDto ToDto(AppSettings s) =>
        new(s.ImageSource.ToString(), s.AutoSyncInterval);
}

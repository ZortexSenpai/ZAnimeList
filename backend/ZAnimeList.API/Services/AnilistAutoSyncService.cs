using Microsoft.EntityFrameworkCore;
using ZAnimeList.API.Data;

namespace ZAnimeList.API.Services;

public class AnilistAutoSyncService(
    IServiceScopeFactory factory,
    ILogger<AnilistAutoSyncService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("AniList auto-sync service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

                using var checkScope = factory.CreateScope();
                var db = checkScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var settings = await db.Settings.FindAsync([1], stoppingToken) ?? new();

                var interval = ParseInterval(settings.AutoSyncInterval);
                if (!interval.HasValue) continue;

                var nextSync = (settings.LastAutoSync ?? DateTime.MinValue) + interval.Value;
                if (DateTime.UtcNow < nextSync) continue;

                var users = await db.Users
                    .Where(u => u.AnilistUsername != null)
                    .Select(u => new { u.Id, u.AnilistUsername })
                    .ToListAsync(stoppingToken);

                logger.LogInformation("Auto-sync: starting sync for {Count} user(s).", users.Count);

                foreach (var user in users)
                {
                    if (stoppingToken.IsCancellationRequested) break;
                    try
                    {
                        using var syncScope = factory.CreateScope();
                        var anilistService = syncScope.ServiceProvider.GetRequiredService<AnilistImportService>();
                        await anilistService.ImportByUsernameAsync(user.AnilistUsername!, user.Id);
                        logger.LogInformation("Auto-sync: finished user {UserId} ({Username}).", user.Id, user.AnilistUsername);
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Auto-sync: error syncing user {UserId}.", user.Id);
                    }
                }

                // Record completion time in a fresh scope so we don't conflict with per-user scopes
                using var updateScope = factory.CreateScope();
                var updateDb = updateScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var liveSettings = await updateDb.Settings.FindAsync([1], stoppingToken);
                if (liveSettings != null)
                {
                    liveSettings.LastAutoSync = DateTime.UtcNow;
                    await updateDb.SaveChangesAsync(stoppingToken);
                }

                logger.LogInformation("Auto-sync: all users synced.");
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Auto-sync: unexpected error in sync loop.");
            }
        }

        logger.LogInformation("AniList auto-sync service stopped.");
    }

    public static TimeSpan? ParseInterval(string? interval) => interval switch
    {
        "15min" => TimeSpan.FromMinutes(15),
        "30min" => TimeSpan.FromMinutes(30),
        "1h"    => TimeSpan.FromHours(1),
        "6h"    => TimeSpan.FromHours(6),
        "1d"    => TimeSpan.FromDays(1),
        "1week" => TimeSpan.FromDays(7),
        _       => null,
    };
}

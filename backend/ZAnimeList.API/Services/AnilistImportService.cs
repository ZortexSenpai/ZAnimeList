using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ZAnimeList.API.Data;
using ZAnimeList.API.DTOs;
using ZAnimeList.API.Models;

namespace ZAnimeList.API.Services;

public class AnilistImportService(AppDbContext db, HttpClient httpClient)
{
    private const string AnilistApiUrl = "https://graphql.anilist.co";

    public async Task<AnilistImportResultDto> ImportByUsernameAsync(string username, int userId, Func<ImportProgressDto, Task>? onProgress = null)
    {
        int imported = 0, skipped = 0, processed = 0;
        var errors = new List<string>();
        var page = 1;
        bool hasNextPage;

        // Get AniList numeric user ID + profile media early
        var (anilistUserId, avatarUrl, bannerUrl) = await GetAnilistUserProfileAsync(username);

        var settings = await db.Settings.FindAsync(1) ?? new AppSettings();
        var imageSource = settings.ImageSource;

        var genreCache = await db.Genres
            .ToDictionaryAsync(g => g.Name, StringComparer.OrdinalIgnoreCase);

        // Pre-load user's existing AniList entries to skip duplicates without per-entry queries.
        var existingAnilistIds = await db.UserAnimes
            .Where(ua => ua.UserId == userId && ua.Anime.AnilistId != null)
            .Select(ua => ua.Anime.AnilistId!.Value)
            .ToHashSetAsync();

        do
        {
            var query = """
                query ($username: String, $page: Int) {
                  Page(page: $page, perPage: 50) {
                    pageInfo { hasNextPage }
                    mediaList(userName: $username, type: ANIME) {
                      media {
                        id
                        idMal
                        title { romaji english }
                        episodes
                        coverImage { large }
                        description(asHtml: false)
                        genres
                        startDate { year month day }
                      }
                      status
                      score
                      progress
                      startedAt { year month day }
                      completedAt { year month day }
                    }
                  }
                }
                """;

            var payload = JsonSerializer.Serialize(new { query, variables = new { username, page } });

            var request = new HttpRequestMessage(HttpMethod.Post, AnilistApiUrl)
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                errors.Add($"AniList API error: {response.StatusCode}");
                break;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            var pageData = doc.RootElement
                .GetProperty("data")
                .GetProperty("Page");

            hasNextPage = pageData.GetProperty("pageInfo").GetProperty("hasNextPage").GetBoolean();
            var mediaList = pageData.GetProperty("mediaList");

            foreach (var item in mediaList.EnumerateArray())
            {
                try
                {
                    var media = item.GetProperty("media");
                    var anilistId = media.GetProperty("id").GetInt32();
                    var titleRomaji = media.GetProperty("title").GetProperty("romaji").GetString() ?? string.Empty;
                    var titleEnglish = media.GetProperty("title").GetProperty("english").ValueKind == JsonValueKind.Null
                        ? null
                        : media.GetProperty("title").GetProperty("english").GetString();

                    if (onProgress != null)
                        await onProgress(new ImportProgressDto(++processed, null, titleRomaji));

                    var statusStr = item.GetProperty("status").GetString() ?? string.Empty;
                    var score = item.GetProperty("score").GetDouble();
                    var progress = item.GetProperty("progress").GetInt32();
                    var startedAt = ParseAnilistDate(item.GetProperty("startedAt"));
                    var completedAt = ParseAnilistDate(item.GetProperty("completedAt"));

                    var status = statusStr switch
                    {
                        "CURRENT"   => AnimeStatus.Watching,
                        "COMPLETED" => AnimeStatus.Completed,
                        "PAUSED"    => AnimeStatus.OnHold,
                        "DROPPED"   => AnimeStatus.Dropped,
                        "PLANNING"  => AnimeStatus.PlanToWatch,
                        _           => AnimeStatus.PlanToWatch
                    };

                    if (existingAnilistIds.Contains(anilistId))
                    {
                        // Update status, score, progress and dates on existing entry
                        var existing = await db.UserAnimes
                            .Where(ua => ua.UserId == userId && ua.Anime.AnilistId == anilistId)
                            .FirstOrDefaultAsync();
                        if (existing != null)
                        {
                            existing.Status = status;
                            existing.Score = score > 0 ? (int)score : null;
                            existing.EpisodesWatched = progress;
                            if (startedAt.HasValue) existing.StartedAt = startedAt;
                            if (completedAt.HasValue) existing.FinishedAt = completedAt;
                        }
                        skipped++;
                        continue;
                    }

                    var episodes = media.GetProperty("episodes").ValueKind == JsonValueKind.Null
                        ? (int?)null
                        : media.GetProperty("episodes").GetInt32();

                    var anilistImageUrl = media.GetProperty("coverImage").GetProperty("large").ValueKind == JsonValueKind.Null
                        ? null
                        : media.GetProperty("coverImage").GetProperty("large").GetString();

                    var idMal = media.TryGetProperty("idMal", out var idMalEl) && idMalEl.ValueKind != JsonValueKind.Null
                        ? idMalEl.GetInt32()
                        : (int?)null;

                    var description = media.GetProperty("description").ValueKind == JsonValueKind.Null
                        ? null
                        : media.GetProperty("description").GetString();

                    var genreNames = media.GetProperty("genres")
                        .EnumerateArray()
                        .Select(g => g.GetString() ?? string.Empty)
                        .Where(g => !string.IsNullOrEmpty(g))
                        .ToList();

                    var airedFrom = ParseAnilistDate(media.GetProperty("startDate"));
                    var (imageData, imageMime, resolvedUrl) = await ResolveImageAsync(imageSource, anilistImageUrl, idMal);

                    // Reuse existing shared Anime or create a new one.
                    var anime = await db.Animes.FirstOrDefaultAsync(a => a.AnilistId == anilistId);
                    if (anime == null)
                    {
                        anime = new Anime
                        {
                            Title = titleRomaji,
                            TitleEnglish = titleEnglish,
                            Synopsis = description,
                            CoverImageUrl = resolvedUrl,
                            CoverImageData = imageData,
                            CoverImageMimeType = imageMime,
                            AiredFrom = airedFrom,
                            AnilistId = anilistId,
                            MalId = idMal,
                            TotalEpisodes = episodes,
                        };

                        foreach (var genreName in genreNames)
                        {
                            if (!genreCache.TryGetValue(genreName, out var genre))
                            {
                                genre = new Genre { Name = genreName };
                                db.Genres.Add(genre);
                                genreCache[genreName] = genre;
                            }
                            anime.AnimeGenres.Add(new AnimeGenre { Genre = genre });
                        }

                        db.Animes.Add(anime);
                        await db.SaveChangesAsync();
                    }

                    db.UserAnimes.Add(new UserAnime
                    {
                        UserId = userId,
                        AnimeId = anime.Id,
                        Status = status,
                        Score = score > 0 ? (int)score : null,
                        EpisodesWatched = progress,
                        StartedAt = startedAt,
                        FinishedAt = completedAt,
                    });

                    existingAnilistIds.Add(anilistId);
                    imported++;
                }
                catch (Exception ex)
                {
                    errors.Add($"Error importing entry: {ex.Message}");
                    skipped++;
                }
            }

            await db.SaveChangesAsync();
            page++;
        } while (hasNextPage);

        // Copy AniList avatar URL + banner if not already set
        var dbUser = await db.Users.FindAsync(userId);
        if (dbUser != null)
        {
            if (dbUser.AnilistAvatarUrl == null && !string.IsNullOrEmpty(avatarUrl))
                dbUser.AnilistAvatarUrl = avatarUrl;

            if (dbUser.BannerImageUrl == null && !string.IsNullOrEmpty(bannerUrl))
                dbUser.BannerImageUrl = bannerUrl;

            await db.SaveChangesAsync();
        }

        // Import activity log after the list
        if (anilistUserId.HasValue)
        {
            if (onProgress != null)
                await onProgress(new ImportProgressDto(0, null, "Fetching activity…"));
            await ImportActivitiesAsync(anilistUserId.Value, userId, onProgress);
        }

        return new AnilistImportResultDto(imported, skipped, errors);
    }

    public async Task<AnilistImportResultDto> ImportFromJsonAsync(Stream jsonStream, int userId, Func<ImportProgressDto, Task>? onProgress = null)
    {
        int imported = 0, skipped = 0, processed = 0;
        var errors = new List<string>();

        var settings = await db.Settings.FindAsync(1) ?? new AppSettings();
        var imageSource = settings.ImageSource;

        var genreCache = await db.Genres
            .ToDictionaryAsync(g => g.Name, StringComparer.OrdinalIgnoreCase);

        var existingAnilistIds = await db.UserAnimes
            .Where(ua => ua.UserId == userId && ua.Anime.AnilistId != null)
            .Select(ua => ua.Anime.AnilistId!.Value)
            .ToHashSetAsync();

        using var doc = await JsonDocument.ParseAsync(jsonStream);
        var lists = doc.RootElement.GetProperty("lists");

        var totalEntries = lists.EnumerateArray()
            .Sum(l => l.GetProperty("entries").EnumerateArray().Count());

        foreach (var list in lists.EnumerateArray())
        {
            foreach (var entry in list.GetProperty("entries").EnumerateArray())
            {
                try
                {
                    var media = entry.GetProperty("media");
                    var anilistId = media.GetProperty("id").GetInt32();
                    var titleRomaji = media.GetProperty("title").GetProperty("romaji").GetString() ?? string.Empty;
                    var titleEnglish = media.GetProperty("title").TryGetProperty("english", out var eng) && eng.ValueKind != JsonValueKind.Null
                        ? eng.GetString()
                        : null;

                    if (onProgress != null)
                        await onProgress(new ImportProgressDto(++processed, totalEntries, titleRomaji));

                    var statusStr = entry.GetProperty("status").GetString() ?? string.Empty;
                    var score = entry.GetProperty("score").GetDouble();
                    var progress = entry.GetProperty("progress").GetInt32();
                    var startedAt = entry.TryGetProperty("startedAt", out var sAt) ? ParseAnilistDate(sAt) : null;
                    var completedAt = entry.TryGetProperty("completedAt", out var cAt) ? ParseAnilistDate(cAt) : null;

                    var status = statusStr switch
                    {
                        "CURRENT"   => AnimeStatus.Watching,
                        "COMPLETED" => AnimeStatus.Completed,
                        "PAUSED"    => AnimeStatus.OnHold,
                        "DROPPED"   => AnimeStatus.Dropped,
                        "PLANNING"  => AnimeStatus.PlanToWatch,
                        _           => AnimeStatus.PlanToWatch
                    };

                    if (existingAnilistIds.Contains(anilistId))
                    {
                        var existing = await db.UserAnimes
                            .Where(ua => ua.UserId == userId && ua.Anime.AnilistId == anilistId)
                            .FirstOrDefaultAsync();
                        if (existing != null)
                        {
                            existing.Status = status;
                            existing.Score = score > 0 ? (int)score : null;
                            existing.EpisodesWatched = progress;
                            if (startedAt.HasValue) existing.StartedAt = startedAt;
                            if (completedAt.HasValue) existing.FinishedAt = completedAt;
                        }
                        skipped++;
                        continue;
                    }
                    var totalEpisodes = media.TryGetProperty("episodes", out var ep) && ep.ValueKind != JsonValueKind.Null
                        ? ep.GetInt32()
                        : (int?)null;

                    var anilistImageUrl = media.TryGetProperty("coverImage", out var ci)
                        && ci.TryGetProperty("large", out var large)
                        && large.ValueKind != JsonValueKind.Null
                        ? large.GetString()
                        : null;

                    var idMal = media.TryGetProperty("idMal", out var idMalEl) && idMalEl.ValueKind != JsonValueKind.Null
                        ? idMalEl.GetInt32()
                        : (int?)null;

                    var genreNames = media.TryGetProperty("genres", out var genresProp)
                        ? genresProp.EnumerateArray()
                            .Select(g => g.GetString() ?? string.Empty)
                            .Where(g => !string.IsNullOrEmpty(g))
                            .ToList()
                        : new List<string>();

                    var (imageData, imageMime, resolvedUrl) = await ResolveImageAsync(imageSource, anilistImageUrl, idMal);

                    // Reuse existing shared Anime or create a new one.
                    var anime = await db.Animes.FirstOrDefaultAsync(a => a.AnilistId == anilistId);
                    if (anime == null)
                    {
                        anime = new Anime
                        {
                            Title = titleRomaji,
                            TitleEnglish = titleEnglish,
                            AnilistId = anilistId,
                            MalId = idMal,
                            TotalEpisodes = totalEpisodes,
                            CoverImageUrl = resolvedUrl,
                            CoverImageData = imageData,
                            CoverImageMimeType = imageMime,
                        };

                        foreach (var genreName in genreNames)
                        {
                            if (!genreCache.TryGetValue(genreName, out var genre))
                            {
                                genre = new Genre { Name = genreName };
                                db.Genres.Add(genre);
                                genreCache[genreName] = genre;
                            }
                            anime.AnimeGenres.Add(new AnimeGenre { Genre = genre });
                        }

                        db.Animes.Add(anime);
                        await db.SaveChangesAsync();
                    }

                    db.UserAnimes.Add(new UserAnime
                    {
                        UserId = userId,
                        AnimeId = anime.Id,
                        Status = status,
                        Score = score > 0 ? (int)score : null,
                        EpisodesWatched = progress,
                        StartedAt = startedAt,
                        FinishedAt = completedAt,
                    });

                    existingAnilistIds.Add(anilistId);
                    imported++;
                }
                catch (Exception ex)
                {
                    errors.Add($"Error importing entry: {ex.Message}");
                    skipped++;
                }
            }
        }

        await db.SaveChangesAsync();
        return new AnilistImportResultDto(imported, skipped, errors);
    }

    public async Task<List<AnilistSearchResultDto>> SearchAsync(string query)
    {
        var gqlQuery = """
            query ($search: String) {
              Page(page: 1, perPage: 10) {
                media(search: $search, type: ANIME) {
                  id
                  idMal
                  title { romaji english }
                  episodes
                  coverImage { large }
                  description(asHtml: false)
                  genres
                }
              }
            }
            """;

        var payload = JsonSerializer.Serialize(new { query = gqlQuery, variables = new { search = query } });
        var request = new HttpRequestMessage(HttpMethod.Post, AnilistApiUrl)
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return [];

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var media = doc.RootElement.GetProperty("data").GetProperty("Page").GetProperty("media");

            var results = new List<AnilistSearchResultDto>();
            foreach (var m in media.EnumerateArray())
            {
                var anilistId = m.GetProperty("id").GetInt32();
                var malId = m.TryGetProperty("idMal", out var idMalEl) && idMalEl.ValueKind != JsonValueKind.Null
                    ? idMalEl.GetInt32() : (int?)null;
                var title = m.GetProperty("title").GetProperty("romaji").GetString() ?? string.Empty;
                var titleEnglish = m.GetProperty("title").GetProperty("english").ValueKind == JsonValueKind.Null
                    ? null : m.GetProperty("title").GetProperty("english").GetString();
                var episodes = m.GetProperty("episodes").ValueKind == JsonValueKind.Null
                    ? (int?)null : m.GetProperty("episodes").GetInt32();
                var coverImageUrl = m.GetProperty("coverImage").GetProperty("large").ValueKind == JsonValueKind.Null
                    ? null : m.GetProperty("coverImage").GetProperty("large").GetString();
                var description = m.GetProperty("description").ValueKind == JsonValueKind.Null
                    ? null : m.GetProperty("description").GetString();
                var genres = m.GetProperty("genres")
                    .EnumerateArray()
                    .Select(g => g.GetString() ?? string.Empty)
                    .Where(g => !string.IsNullOrEmpty(g))
                    .ToArray();

                results.Add(new AnilistSearchResultDto(
                    anilistId, malId, title, titleEnglish, description, coverImageUrl, episodes, genres));
            }
            return results;
        }
        catch
        {
            return [];
        }
    }

    private async Task<(int? userId, string? avatarUrl, string? bannerUrl)> GetAnilistUserProfileAsync(string username)
    {
        var query = """
            query ($username: String) {
              User(name: $username) {
                id
                avatar { large }
                bannerImage
              }
            }
            """;

        var payload = JsonSerializer.Serialize(new { query, variables = new { username } });
        var request = new HttpRequestMessage(HttpMethod.Post, AnilistApiUrl)
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return (null, null, null);
            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var user = doc.RootElement.GetProperty("data").GetProperty("User");
            var id = user.GetProperty("id").GetInt32();
            var avatarUrl = user.TryGetProperty("avatar", out var av) && av.TryGetProperty("large", out var lg) && lg.ValueKind != JsonValueKind.Null
                ? lg.GetString() : null;
            var bannerUrl = user.TryGetProperty("bannerImage", out var bi) && bi.ValueKind != JsonValueKind.Null
                ? bi.GetString() : null;
            return (id, avatarUrl, bannerUrl);
        }
        catch { return (null, null, null); }
    }

    private async Task ImportActivitiesAsync(int anilistUserId, int userId, Func<ImportProgressDto, Task>? onProgress)
    {
        // Pre-load existing activity IDs to enable incremental sync
        var existingIds = await db.WatchActivities
            .Where(wa => wa.UserId == userId)
            .Select(wa => wa.AnilistActivityId)
            .ToHashSetAsync();

        // Pre-load UserAnimeId lookup by AnilistMediaId for linking activities to list entries
        var userAnimeByMediaId = await db.UserAnimes
            .Where(ua => ua.UserId == userId && ua.Anime.AnilistId != null)
            .Select(ua => new { ua.Id, ua.Anime.AnilistId })
            .ToDictionaryAsync(ua => ua.AnilistId!.Value, ua => ua.Id);

        var page = 1;
        bool hasNextPage;
        int activitiesImported = 0;

        do
        {
            if (onProgress != null)
                await onProgress(new ImportProgressDto(activitiesImported, null, $"Fetching activity page {page}…"));

            var query = """
                query ($userId: Int, $page: Int) {
                  Page(page: $page, perPage: 50) {
                    pageInfo { hasNextPage }
                    activities(userId: $userId, type: ANIME_LIST, sort: ID_DESC) {
                      ... on ListActivity {
                        id
                        status
                        progress
                        media {
                          id
                          title { romaji }
                        }
                        createdAt
                      }
                    }
                  }
                }
                """;

            var payload = JsonSerializer.Serialize(new { query, variables = new { userId = anilistUserId, page } });
            var request = new HttpRequestMessage(HttpMethod.Post, AnilistApiUrl)
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                Console.Error.WriteLine($"[ActivityImport] AniList API error {response.StatusCode}: {errorBody}");
                break;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            // Check for GraphQL-level errors (status 200 but with errors field)
            if (doc.RootElement.TryGetProperty("errors", out var errorsEl))
            {
                Console.Error.WriteLine($"[ActivityImport] AniList GraphQL errors: {errorsEl}");
                break;
            }

            var pageData = doc.RootElement.GetProperty("data").GetProperty("Page");
            hasNextPage = pageData.GetProperty("pageInfo").GetProperty("hasNextPage").GetBoolean();

            foreach (var activity in pageData.GetProperty("activities").EnumerateArray())
            {
                // Non-ListActivity entries (TextActivity etc.) won't have "id" from our fragment
                if (!activity.TryGetProperty("id", out var idEl)) continue;

                var anilistActivityId = idEl.GetInt64();
                if (existingIds.Contains(anilistActivityId)) continue;

                var status = activity.GetProperty("status").GetString() ?? string.Empty;
                var progress = activity.TryGetProperty("progress", out var progEl) && progEl.ValueKind != JsonValueKind.Null
                    ? progEl.GetString() : null;

                var media = activity.GetProperty("media");
                var anilistMediaId = media.GetProperty("id").GetInt32();
                var mediaTitle = media.GetProperty("title").GetProperty("romaji").GetString() ?? string.Empty;
                var createdAtUnix = activity.GetProperty("createdAt").GetInt64();
                var createdAt = DateTimeOffset.FromUnixTimeSeconds(createdAtUnix).UtcDateTime;

                int? userAnimeId = userAnimeByMediaId.TryGetValue(anilistMediaId, out var uaId) ? uaId : null;

                db.WatchActivities.Add(new WatchActivity
                {
                    UserId = userId,
                    UserAnimeId = userAnimeId,
                    AnilistActivityId = anilistActivityId,
                    AnilistMediaId = anilistMediaId,
                    MediaTitle = mediaTitle,
                    Status = status,
                    Progress = progress,
                    CreatedAt = createdAt,
                });

                existingIds.Add(anilistActivityId);
                activitiesImported++;
            }

            await db.SaveChangesAsync();
            page++;
        } while (hasNextPage);
    }

    private async Task<(byte[]? data, string? mime, string? url)> ResolveImageAsync(
        ImageSource source, string? anilistUrl, int? malId)
    {
        switch (source)
        {
            case ImageSource.Local:
                if (string.IsNullOrEmpty(anilistUrl)) return (null, null, null);
                var (data, mime) = await DownloadImageAsync(anilistUrl);
                return (data, mime, anilistUrl);

            case ImageSource.Anilist:
                return (null, null, anilistUrl);

            case ImageSource.MyAnimeList:
                if (malId.HasValue)
                {
                    var malUrl = await GetJikanImageUrlAsync(malId.Value);
                    if (malUrl is not null) return (null, null, malUrl);
                }
                return (null, null, anilistUrl);
        }

        return (null, null, anilistUrl);
    }

    private static DateTime? ParseAnilistDate(JsonElement dateEl)
    {
        if (dateEl.ValueKind == JsonValueKind.Null) return null;
        var year  = dateEl.GetProperty("year").ValueKind  == JsonValueKind.Null ? (int?)null : dateEl.GetProperty("year").GetInt32();
        var month = dateEl.GetProperty("month").ValueKind == JsonValueKind.Null ? (int?)null : dateEl.GetProperty("month").GetInt32();
        var day   = dateEl.GetProperty("day").ValueKind   == JsonValueKind.Null ? (int?)null : dateEl.GetProperty("day").GetInt32();
        if (year is null) return null;
        return new DateTime(year.Value, month ?? 1, day ?? 1, 0, 0, 0, DateTimeKind.Utc);
    }

    private async Task<(byte[]? data, string? mime)> DownloadImageAsync(string? url)
    {
        if (string.IsNullOrEmpty(url)) return (null, null);
        try
        {
            var response = await httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return (null, null);
            var data = await response.Content.ReadAsByteArrayAsync();
            var mime = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
            return (data, mime);
        }
        catch
        {
            return (null, null);
        }
    }

    internal async Task<string?> GetJikanImageUrlAsync(int malId)
    {
        try
        {
            await Task.Delay(400);
            var response = await httpClient.GetAsync($"https://api.jikan.moe/v4/anime/{malId}");
            if (!response.IsSuccessStatusCode) return null;
            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement
                .GetProperty("data")
                .GetProperty("images")
                .GetProperty("jpg")
                .GetProperty("large_image_url")
                .GetString();
        }
        catch
        {
            return null;
        }
    }
}

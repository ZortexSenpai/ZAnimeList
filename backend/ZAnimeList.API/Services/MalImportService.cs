using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using ZAnimeList.API.Data;
using ZAnimeList.API.DTOs;
using ZAnimeList.API.Models;

namespace ZAnimeList.API.Services;

public class MalImportService(AppDbContext db, HttpClient httpClient)
{
    private const string AnilistApiUrl = "https://graphql.anilist.co";

    public async Task<MalImportResultDto> ImportAsync(Stream xmlStream, int userId)
    {
        var doc = XDocument.Load(xmlStream);
        var entries = doc.Descendants("anime").ToList();

        int imported = 0, skipped = 0;
        var errors = new List<string>();

        var settings = await db.Settings.FindAsync(1) ?? new AppSettings();
        var imageSource = settings.ImageSource;

        // Batch-fetch AniList metadata (id + image URL) for all MAL IDs upfront.
        // This sets AnilistId on every imported entry and provides image URLs for the Anilist source.
        var allMalIds = entries
            .Select(e => int.TryParse(e.Element("series_animedb_id")?.Value, out var id) ? id : 0)
            .Where(id => id > 0)
            .ToList();
        var anilistInfoMap = await FetchAnilistMediaInfoAsync(allMalIds);

        foreach (var entry in entries)
        {
            try
            {
                var malId = int.Parse(entry.Element("series_animedb_id")?.Value ?? "0");
                var title = entry.Element("series_title")?.Value ?? string.Empty;
                var statusStr = entry.Element("my_status")?.Value ?? string.Empty;
                var score = int.TryParse(entry.Element("my_score")?.Value, out var s) ? (int?)s : null;
                var episodesWatched = int.TryParse(entry.Element("my_watched_episodes")?.Value, out var ep) ? ep : 0;
                var totalEpisodes = int.TryParse(entry.Element("series_episodes")?.Value, out var total) ? (int?)total : null;

                if (malId == 0 || string.IsNullOrEmpty(title))
                {
                    skipped++;
                    continue;
                }

                if (await db.Animes.AnyAsync(a => a.MalId == malId && a.UserId == userId))
                {
                    skipped++;
                    continue;
                }

                var status = statusStr switch
                {
                    "Watching"      => AnimeStatus.Watching,
                    "Completed"     => AnimeStatus.Completed,
                    "On-Hold"       => AnimeStatus.OnHold,
                    "Dropped"       => AnimeStatus.Dropped,
                    "Plan to Watch" => AnimeStatus.PlanToWatch,
                    _               => AnimeStatus.PlanToWatch
                };

                anilistInfoMap.TryGetValue(malId, out var anilistInfo);

                var anime = new Anime
                {
                    Title = title,
                    MalId = malId,
                    AnilistId = anilistInfo?.AnilistId,
                    Status = status,
                    Score = score == 0 ? null : score,
                    EpisodesWatched = episodesWatched,
                    TotalEpisodes = totalEpisodes == 0 ? null : totalEpisodes,
                    UserId = userId,
                };

                switch (imageSource)
                {
                    case ImageSource.Local:
                    {
                        // Jikan → download bytes
                        var imageUrl = await GetJikanImageUrlAsync(malId);
                        if (imageUrl is not null)
                        {
                            var (data, mime) = await DownloadImageAsync(imageUrl);
                            anime.CoverImageUrl = imageUrl;
                            anime.CoverImageData = data;
                            anime.CoverImageMimeType = mime;
                        }
                        break;
                    }
                    case ImageSource.MyAnimeList:
                    {
                        // Jikan → store URL only
                        anime.CoverImageUrl = await GetJikanImageUrlAsync(malId);
                        break;
                    }
                    case ImageSource.Anilist:
                    {
                        // Use pre-fetched AniList image URL
                        anime.CoverImageUrl = anilistInfo?.ImageUrl;
                        break;
                    }
                }

                db.Animes.Add(anime);
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add($"Error importing entry: {ex.Message}");
                skipped++;
            }
        }

        await db.SaveChangesAsync();
        return new MalImportResultDto(imported, skipped, errors);
    }

    public XDocument ExportAsync(IEnumerable<Anime> animes)
    {
        var doc = new XDocument(
            new XDeclaration("1.0", "UTF-8", null),
            new XElement("myanimelist",
                new XElement("myinfo",
                    new XElement("export_type", "anime")
                ),
                animes.Select(a => new XElement("anime",
                    new XElement("series_animedb_id", a.MalId?.ToString() ?? "0"),
                    new XElement("series_title", a.Title),
                    new XElement("series_episodes", a.TotalEpisodes?.ToString() ?? "0"),
                    new XElement("my_watched_episodes", a.EpisodesWatched),
                    new XElement("my_score", a.Score?.ToString() ?? "0"),
                    new XElement("my_status", a.Status switch
                    {
                        AnimeStatus.Watching     => "Watching",
                        AnimeStatus.Completed    => "Completed",
                        AnimeStatus.OnHold       => "On-Hold",
                        AnimeStatus.Dropped      => "Dropped",
                        AnimeStatus.PlanToWatch  => "Plan to Watch",
                        _                        => "Plan to Watch"
                    })
                ))
            )
        );
        return doc;
    }

    private record AnilistMediaInfo(int AnilistId, string? ImageUrl);

    // Batch-fetches AniList id and cover image URL for a list of MAL IDs.
    // AniList supports querying by idMal_in which avoids per-entry requests.
    private async Task<Dictionary<int, AnilistMediaInfo>> FetchAnilistMediaInfoAsync(List<int> malIds)
    {
        var result = new Dictionary<int, AnilistMediaInfo>();
        const int batchSize = 50;

        for (int i = 0; i < malIds.Count; i += batchSize)
        {
            var batch = malIds.Skip(i).Take(batchSize).ToList();
            var query = """
                query ($ids: [Int]) {
                  Page(page: 1, perPage: 50) {
                    media(idMal_in: $ids, type: ANIME) {
                      id
                      idMal
                      coverImage { large }
                    }
                  }
                }
                """;

            var payload = JsonSerializer.Serialize(new { query, variables = new { ids = batch } });
            var request = new HttpRequestMessage(HttpMethod.Post, AnilistApiUrl)
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            try
            {
                var response = await httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) continue;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var media = doc.RootElement.GetProperty("data").GetProperty("Page").GetProperty("media");

                foreach (var m in media.EnumerateArray())
                {
                    if (m.GetProperty("idMal").ValueKind == JsonValueKind.Null) continue;
                    var malId = m.GetProperty("idMal").GetInt32();
                    var anilistId = m.GetProperty("id").GetInt32();
                    var urlEl = m.GetProperty("coverImage").GetProperty("large");
                    var imageUrl = urlEl.ValueKind != JsonValueKind.Null ? urlEl.GetString() : null;
                    result[malId] = new AnilistMediaInfo(anilistId, imageUrl);
                }

                if (i + batchSize < malIds.Count)
                    await Task.Delay(1100); // AniList rate limiting between batches
            }
            catch
            {
                // Skip batch on error
            }
        }

        return result;
    }

    // Jikan (unofficial MAL API) — rate limit ~3 req/s; 400ms delay is safe.
    // Note: large MAL lists will be slow when image source is Local or MyAnimeList.
    private async Task<string?> GetJikanImageUrlAsync(int malId)
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

    private async Task<(byte[]? data, string? mime)> DownloadImageAsync(string url)
    {
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
}

namespace ZAnimeList.API.DTOs;

public record WatchActivityDto(
    int Id,
    int? UserAnimeId,
    long AnilistActivityId,
    int? AnilistMediaId,
    string MediaTitle,
    string Status,
    string? Progress,
    DateTime CreatedAt
);

public record ActivityStatsDto(
    int TotalEpisodesWatched,
    int UniqueTitles,
    int CurrentStreak,
    int LongestStreak,
    int[] HourDistribution,      // 24 elements, index = UTC hour
    int[] DayDistribution,       // 7 elements, index = 0 (Sun) .. 6 (Sat)
    MonthlyCountDto[] MonthlyActivity,  // last 12 months
    TopAnimeEntryDto[] TopAnime
);

public record MonthlyCountDto(int Year, int Month, int Count);
public record TopAnimeEntryDto(string Title, int Count);
public record DailyCountDto(string Date, int Count);

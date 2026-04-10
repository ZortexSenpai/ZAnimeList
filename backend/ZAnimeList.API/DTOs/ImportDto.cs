namespace ZAnimeList.API.DTOs;

public record MalImportResultDto(int Imported, int Skipped, List<string> Errors);
public record AnilistImportResultDto(int Imported, int Skipped, List<string> Errors);

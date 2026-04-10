using Microsoft.EntityFrameworkCore;
using ZAnimeList.API.Models;

namespace ZAnimeList.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Anime> Animes => Set<Anime>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<AnimeGenre> AnimeGenres => Set<AnimeGenre>();
    public DbSet<AppSettings> Settings => Set<AppSettings>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserAnime> UserAnimes => Set<UserAnime>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AnimeGenre>()
            .HasKey(ag => new { ag.AnimeId, ag.GenreId });

        modelBuilder.Entity<AnimeGenre>()
            .HasOne(ag => ag.Anime)
            .WithMany(a => a.AnimeGenres)
            .HasForeignKey(ag => ag.AnimeId);

        modelBuilder.Entity<AnimeGenre>()
            .HasOne(ag => ag.Genre)
            .WithMany(g => g.AnimeGenres)
            .HasForeignKey(ag => ag.GenreId);

        modelBuilder.Entity<UserAnime>()
            .Property(ua => ua.Status)
            .HasConversion<string>();

        modelBuilder.Entity<UserAnime>()
            .HasOne(ua => ua.User)
            .WithMany(u => u.UserAnimes)
            .HasForeignKey(ua => ua.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserAnime>()
            .HasOne(ua => ua.Anime)
            .WithMany(a => a.UserAnimes)
            .HasForeignKey(ua => ua.AnimeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserAnime>()
            .HasIndex(ua => new { ua.UserId, ua.AnimeId })
            .IsUnique();

        modelBuilder.Entity<Genre>()
            .HasIndex(g => g.Name)
            .IsUnique();

        modelBuilder.Entity<AppSettings>()
            .Property(s => s.ImageSource)
            .HasConversion<string>();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<User>()
            .Property(u => u.Role)
            .HasConversion<string>();
    }
}

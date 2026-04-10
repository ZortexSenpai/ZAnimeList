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

        modelBuilder.Entity<Anime>()
            .Property(a => a.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Anime>()
            .HasOne(a => a.User)
            .WithMany(u => u.Animes)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

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

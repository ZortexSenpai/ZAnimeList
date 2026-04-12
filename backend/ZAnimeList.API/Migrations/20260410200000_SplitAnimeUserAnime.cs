using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZAnimeList.API.Migrations
{
    /// <inheritdoc />
    public partial class SplitAnimeUserAnime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Create UserAnimes table
            migrationBuilder.CreateTable(
                name: "UserAnimes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    AnimeId = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    Score = table.Column<int>(type: "INTEGER", nullable: true),
                    EpisodesWatched = table.Column<int>(type: "INTEGER", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    FinishedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAnimes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserAnimes_Animes_AnimeId",
                        column: x => x.AnimeId,
                        principalTable: "Animes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserAnimes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 2. Migrate existing watch data to UserAnimes
            migrationBuilder.Sql(@"
                INSERT INTO ""UserAnimes"" (""UserId"", ""AnimeId"", ""Status"", ""Score"", ""EpisodesWatched"", ""StartedAt"", ""FinishedAt"", ""CreatedAt"", ""UpdatedAt"")
                SELECT ""UserId"", ""Id"", ""Status"", ""Score"", ""EpisodesWatched"", ""StartedAt"", ""FinishedAt"", ""CreatedAt"", ""UpdatedAt""
                FROM ""Animes""
                WHERE ""UserId"" IS NOT NULL
            ");

            // 3. Drop user-specific columns from Animes (EF Core rebuilds the table for SQLite)
            migrationBuilder.DropForeignKey(
                name: "FK_Animes_Users_UserId",
                table: "Animes");

            migrationBuilder.DropIndex(
                name: "IX_Animes_UserId",
                table: "Animes");

            migrationBuilder.DropColumn(name: "EpisodesWatched", table: "Animes");
            migrationBuilder.DropColumn(name: "FinishedAt", table: "Animes");
            migrationBuilder.DropColumn(name: "Score", table: "Animes");
            migrationBuilder.DropColumn(name: "StartedAt", table: "Animes");
            migrationBuilder.DropColumn(name: "Status", table: "Animes");
            migrationBuilder.DropColumn(name: "UserId", table: "Animes");

            // 4. Add indexes on UserAnimes
            migrationBuilder.CreateIndex(
                name: "IX_UserAnimes_AnimeId",
                table: "UserAnimes",
                column: "AnimeId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAnimes_UserId_AnimeId",
                table: "UserAnimes",
                columns: new[] { "UserId", "AnimeId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "UserAnimes");

            migrationBuilder.AddColumn<int>(
                name: "EpisodesWatched",
                table: "Animes",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "FinishedAt",
                table: "Animes",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Score",
                table: "Animes",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                table: "Animes",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Animes",
                type: "TEXT",
                nullable: false,
                defaultValue: "PlanToWatch");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Animes",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Animes_UserId",
                table: "Animes",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Animes_Users_UserId",
                table: "Animes",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

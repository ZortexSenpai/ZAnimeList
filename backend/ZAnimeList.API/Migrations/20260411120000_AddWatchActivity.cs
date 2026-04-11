using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZAnimeList.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWatchActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WatchActivities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserAnimeId = table.Column<int>(type: "INTEGER", nullable: true),
                    AnilistActivityId = table.Column<long>(type: "INTEGER", nullable: false),
                    AnilistMediaId = table.Column<int>(type: "INTEGER", nullable: true),
                    MediaTitle = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    Progress = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchActivities_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WatchActivities_UserId_AnilistActivityId",
                table: "WatchActivities",
                columns: new[] { "UserId", "AnilistActivityId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WatchActivities_UserId_CreatedAt",
                table: "WatchActivities",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "WatchActivities");
        }
    }
}

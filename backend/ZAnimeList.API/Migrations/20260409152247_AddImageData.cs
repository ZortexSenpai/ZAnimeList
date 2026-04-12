using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZAnimeList.API.Migrations
{
    /// <inheritdoc />
    public partial class AddImageData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "CoverImageData",
                table: "Animes",
                type: "BLOB",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoverImageMimeType",
                table: "Animes",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CoverImageData",
                table: "Animes");

            migrationBuilder.DropColumn(
                name: "CoverImageMimeType",
                table: "Animes");
        }
    }
}

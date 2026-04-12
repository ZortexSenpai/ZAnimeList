using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZAnimeList.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAiredFrom : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AiredFrom",
                table: "Animes",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AiredFrom",
                table: "Animes");
        }
    }
}

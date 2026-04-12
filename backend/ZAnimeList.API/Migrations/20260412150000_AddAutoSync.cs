using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZAnimeList.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAutoSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AutoSyncInterval",
                table: "Settings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastAutoSync",
                table: "Settings",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoSyncInterval",
                table: "Settings");

            migrationBuilder.DropColumn(
                name: "LastAutoSync",
                table: "Settings");
        }
    }
}

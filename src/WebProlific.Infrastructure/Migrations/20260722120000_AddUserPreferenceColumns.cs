using Microsoft.EntityFrameworkCore.Migrations;

namespace WebProlific.Infrastructure.Migrations
{
    public partial class AddUserPreferenceColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LanguageCode",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "en");

            migrationBuilder.AddColumn<string>(
                name: "PreferredCurrencyCode",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "INR");

            migrationBuilder.CreateIndex(
                name: "IX_Users_LanguageCode",
                table: "Users",
                column: "LanguageCode");

            migrationBuilder.CreateIndex(
                name: "IX_Users_PreferredCurrencyCode",
                table: "Users",
                column: "PreferredCurrencyCode");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_LanguageCode",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_PreferredCurrencyCode",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LanguageCode",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PreferredCurrencyCode",
                table: "Users");
        }
    }
}

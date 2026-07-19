using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebProlific.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixGstinNullableAndFilteredIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Make Gstin column nullable (allow NULL values)
            migrationBuilder.AlterColumn<string>(
                name: "Gstin",
                table: "Vendors",
                type: "nvarchar(15)",
                maxLength: 15,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(15)",
                oldMaxLength: 15,
                oldNullable: false);

            // Drop the old unique index that treats NULLs as duplicates
            migrationBuilder.DropIndex(
                name: "IX_Vendors_Gstin",
                table: "Vendors");

            // Create a filtered unique index that allows multiple NULLs
            migrationBuilder.CreateIndex(
                name: "IX_Vendors_Gstin",
                table: "Vendors",
                column: "Gstin",
                unique: true,
                filter: "[Gstin] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert to non-filtered unique index
            migrationBuilder.DropIndex(
                name: "IX_Vendors_Gstin",
                table: "Vendors");

            migrationBuilder.CreateIndex(
                name: "IX_Vendors_Gstin",
                table: "Vendors",
                column: "Gstin",
                unique: true);

            // Make Gstin non-nullable again
            migrationBuilder.AlterColumn<string>(
                name: "Gstin",
                table: "Vendors",
                type: "nvarchar(15)",
                maxLength: 15,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(15)",
                oldMaxLength: 15,
                oldNullable: true);
        }
    }
}
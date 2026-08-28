using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebProlific.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVendorWishMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WishVendorId",
                table: "Vendors",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WishVendorId",
                table: "Vendors");
        }
    }
}

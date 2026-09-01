using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebProlific.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseOrderWishPoNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WishPoNumber",
                table: "PurchaseOrders",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WishPoNumber",
                table: "PurchaseOrders");
        }
    }
}

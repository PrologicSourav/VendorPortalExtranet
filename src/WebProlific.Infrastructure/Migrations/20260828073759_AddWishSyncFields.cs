using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebProlific.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWishSyncFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourcePoNumber",
                table: "PurchaseOrders",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceSystem",
                table: "PurchaseOrders",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceLineId",
                table: "PurchaseOrderLines",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WishPropertyId",
                table: "Properties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_SourceSystem_SourcePoNumber",
                table: "PurchaseOrders",
                columns: new[] { "SourceSystem", "SourcePoNumber" },
                unique: true,
                filter: "[SourceSystem] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_SourceSystem_SourcePoNumber",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "SourcePoNumber",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "SourceSystem",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "SourceLineId",
                table: "PurchaseOrderLines");

            migrationBuilder.DropColumn(
                name: "WishPropertyId",
                table: "Properties");
        }
    }
}

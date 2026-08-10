using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebProlific.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPoTaxAndInstructions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DispatchInstructions",
                table: "PurchaseOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PackingInstructions",
                table: "PurchaseOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Remarks",
                table: "PurchaseOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxAmount",
                table: "PurchaseOrderLines",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "TaxClass",
                table: "PurchaseOrderLines",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DispatchInstructions",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "PackingInstructions",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "Remarks",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "TaxAmount",
                table: "PurchaseOrderLines");

            migrationBuilder.DropColumn(
                name: "TaxClass",
                table: "PurchaseOrderLines");
        }
    }
}

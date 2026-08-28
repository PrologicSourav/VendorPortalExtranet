using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebProlific.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveryNoteLinePoLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PurchaseOrderLineId",
                table: "DeliveryNoteLines",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryNoteLines_PurchaseOrderLineId",
                table: "DeliveryNoteLines",
                column: "PurchaseOrderLineId");

            migrationBuilder.AddForeignKey(
                name: "FK_DeliveryNoteLines_PurchaseOrderLines_PurchaseOrderLineId",
                table: "DeliveryNoteLines",
                column: "PurchaseOrderLineId",
                principalTable: "PurchaseOrderLines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeliveryNoteLines_PurchaseOrderLines_PurchaseOrderLineId",
                table: "DeliveryNoteLines");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryNoteLines_PurchaseOrderLineId",
                table: "DeliveryNoteLines");

            migrationBuilder.DropColumn(
                name: "PurchaseOrderLineId",
                table: "DeliveryNoteLines");
        }
    }
}

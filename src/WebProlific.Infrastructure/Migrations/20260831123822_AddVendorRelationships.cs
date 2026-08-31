using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebProlific.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVendorRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VendorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VendorRelationships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VendorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BuyingEntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PropertyId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ScopeType = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VendorRelationships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VendorRelationships_BuyingEntities_BuyingEntityId",
                        column: x => x.BuyingEntityId,
                        principalTable: "BuyingEntities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VendorRelationships_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VendorRelationships_Vendors_VendorId",
                        column: x => x.VendorId,
                        principalTable: "Vendors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VendorRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VendorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedBuyingEntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedPropertyId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RequestType = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VendorRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VendorRequests_BuyingEntities_RequestedBuyingEntityId",
                        column: x => x.RequestedBuyingEntityId,
                        principalTable: "BuyingEntities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VendorRequests_Properties_RequestedPropertyId",
                        column: x => x.RequestedPropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VendorRequests_Vendors_VendorId",
                        column: x => x.VendorId,
                        principalTable: "Vendors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VendorRelationships_ActiveChainScope",
                table: "VendorRelationships",
                columns: new[] { "VendorId", "BuyingEntityId" },
                unique: true,
                filter: "[PropertyId] IS NULL AND [Status] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_VendorRelationships_ActivePropertyScope",
                table: "VendorRelationships",
                columns: new[] { "VendorId", "PropertyId" },
                unique: true,
                filter: "[PropertyId] IS NOT NULL AND [Status] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_VendorRelationships_BuyingEntityId",
                table: "VendorRelationships",
                column: "BuyingEntityId");

            migrationBuilder.CreateIndex(
                name: "IX_VendorRelationships_PropertyId",
                table: "VendorRelationships",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_VendorRequests_RequestedBuyingEntityId",
                table: "VendorRequests",
                column: "RequestedBuyingEntityId");

            migrationBuilder.CreateIndex(
                name: "IX_VendorRequests_RequestedPropertyId",
                table: "VendorRequests",
                column: "RequestedPropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_VendorRequests_VendorId",
                table: "VendorRequests",
                column: "VendorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "VendorRelationships");

            migrationBuilder.DropTable(
                name: "VendorRequests");
        }
    }
}

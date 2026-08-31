using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebProlific.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVendorUserAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VendorUserAccesses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VendorRelationshipId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VendorUserAccesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VendorUserAccesses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VendorUserAccesses_VendorRelationships_VendorRelationshipId",
                        column: x => x.VendorRelationshipId,
                        principalTable: "VendorRelationships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VendorUserAccesses_UserId_VendorRelationshipId",
                table: "VendorUserAccesses",
                columns: new[] { "UserId", "VendorRelationshipId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VendorUserAccesses_VendorRelationshipId",
                table: "VendorUserAccesses",
                column: "VendorRelationshipId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VendorUserAccesses");
        }
    }
}

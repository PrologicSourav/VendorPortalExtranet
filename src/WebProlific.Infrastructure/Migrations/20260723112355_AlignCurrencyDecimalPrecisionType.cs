using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebProlific.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AlignCurrencyDecimalPrecisionType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<byte>(
                name: "DecimalPrecision",
                table: "Currencies",
                type: "tinyint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "DecimalPrecision",
                table: "Currencies",
                type: "int",
                nullable: false,
                oldClrType: typeof(byte),
                oldType: "tinyint");
        }
    }
}

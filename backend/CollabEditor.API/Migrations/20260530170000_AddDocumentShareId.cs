using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollabEditor.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentShareId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShareId",
                table: "Documents",
                type: "text",
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE \"Documents\" SET \"ShareId\" = substring(md5(random()::text || clock_timestamp()::text || \"Id\"::text), 1, 32) WHERE \"ShareId\" IS NULL;");

            migrationBuilder.AlterColumn<string>(
                name: "ShareId",
                table: "Documents",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Documents_ShareId",
                table: "Documents",
                column: "ShareId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Documents_ShareId",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "ShareId",
                table: "Documents");
        }
    }
}

using CollabEditor.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CollabEditor.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentCollaborator> DocumentCollaborators => Set<DocumentCollaborator>();
    public DbSet<DocumentChangeHistory> DocumentChangeHistory => Set<DocumentChangeHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(user => user.Email)
            .IsUnique();

        modelBuilder.Entity<Document>()
            .HasIndex(document => document.ShareId)
            .IsUnique();

        modelBuilder.Entity<DocumentCollaborator>()
            .HasIndex(collaborator => new { collaborator.DocumentId, collaborator.UserId })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasMany(user => user.Documents)
            .WithOne(document => document.Owner)
            .HasForeignKey(document => document.OwnerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Document>()
            .HasMany(document => document.Collaborators)
            .WithOne(collaborator => collaborator.Document)
            .HasForeignKey(collaborator => collaborator.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasMany(user => user.Collaborations)
            .WithOne(collaborator => collaborator.User)
            .HasForeignKey(collaborator => collaborator.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Document>()
            .HasMany(document => document.ChangeHistory)
            .WithOne(history => history.Document)
            .HasForeignKey(history => history.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasMany(user => user.DocumentChanges)
            .WithOne(history => history.User)
            .HasForeignKey(history => history.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

namespace CollabEditor.API.Models;

public class User
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public ICollection<DocumentCollaborator> Collaborations { get; set; } = new List<DocumentCollaborator>();
    public ICollection<DocumentChangeHistory> DocumentChanges { get; set; } = new List<DocumentChangeHistory>();
}

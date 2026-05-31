namespace CollabEditor.API.Models;

public class Document
{
    public int Id { get; set; }
    public string ShareId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public int OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public ICollection<DocumentCollaborator> Collaborators { get; set; } = new List<DocumentCollaborator>();
    public ICollection<DocumentChangeHistory> ChangeHistory { get; set; } = new List<DocumentChangeHistory>();
}

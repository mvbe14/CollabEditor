namespace CollabEditor.API.Models;

public class DocumentCollaborator
{
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public int UserId { get; set; }
    public string Role { get; set; } = "Editor";
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Document Document { get; set; } = null!;
    public User User { get; set; } = null!;
}

namespace CollabEditor.API.Models;

public class DocumentChangeHistory
{
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public int UserId { get; set; }
    public string ChangeType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = string.Empty;

    public Document Document { get; set; } = null!;
    public User User { get; set; } = null!;
}

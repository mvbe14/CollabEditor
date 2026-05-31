using CollabEditor.API.Data;
using CollabEditor.API.DTOs;
using CollabEditor.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace CollabEditor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/documents")]
public class DocumentsController : ControllerBase
{
    private readonly AppDbContext dbContext;

    public DocumentsController(AppDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DocumentResponseDto>>> GetDocuments()
    {
        var userId = GetCurrentUserId();

        var documents = await dbContext.Documents
            .Include(document => document.Owner)
            .Include(document => document.Collaborators)
            .Where(document =>
                document.OwnerId == userId ||
                document.Collaborators.Any(collaborator => collaborator.UserId == userId))
            .OrderByDescending(document => document.UpdatedAt)
            .ToListAsync();

        return Ok(documents.Select(document => ToResponseDto(document, userId)));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DocumentResponseDto>> GetDocumentById(int id)
    {
        var userId = GetCurrentUserId();
        var document = await dbContext.Documents
            .Include(document => document.Owner)
            .Include(document => document.Collaborators)
            .FirstOrDefaultAsync(document =>
                document.Id == id &&
                (document.OwnerId == userId ||
                    document.Collaborators.Any(collaborator => collaborator.UserId == userId)));

        if (document is null)
        {
            return NotFound();
        }

        return Ok(ToResponseDto(document, userId));
    }

    [HttpGet("{id:int}/history")]
    public async Task<ActionResult<IEnumerable<DocumentHistoryDto>>> GetDocumentHistory(int id)
    {
        var userId = GetCurrentUserId();
        var hasAccess = await UserCanAccessDocument(id, userId);

        if (!hasAccess)
        {
            return NotFound();
        }

        var history = await dbContext.DocumentChangeHistory
            .Include(change => change.User)
            .Where(change => change.DocumentId == id)
            .OrderByDescending(change => change.CreatedAt)
            .Take(20)
            .Select(change => new DocumentHistoryDto(
                change.Id,
                change.ChangeType,
                change.Description,
                change.CreatedAt,
                change.User.UserName))
            .ToListAsync();

        return Ok(history);
    }

    [HttpGet("shared/{shareId}")]
    public async Task<ActionResult<DocumentResponseDto>> GetSharedDocument(string shareId)
    {
        var userId = GetCurrentUserId();
        var document = await dbContext.Documents
            .Include(document => document.Owner)
            .Include(document => document.Collaborators)
            .FirstOrDefaultAsync(document => document.ShareId == shareId);

        if (document is null)
        {
            return NotFound(new { message = "Shared document link is invalid." });
        }

        await AddCollaboratorIfNeeded(document, userId);

        return Ok(ToResponseDto(document, userId));
    }

    [HttpPut("shared/{shareId}")]
    public async Task<ActionResult<DocumentResponseDto>> UpdateSharedDocument(
        string shareId,
        DocumentUpdateDto request)
    {
        var userId = GetCurrentUserId();
        var document = await dbContext.Documents
            .Include(document => document.Owner)
            .Include(document => document.Collaborators)
            .FirstOrDefaultAsync(document => document.ShareId == shareId);

        if (document is null)
        {
            return NotFound(new { message = "Shared document link is invalid." });
        }

        await AddCollaboratorIfNeeded(document, userId);

        UpdateDocumentFields(document, request);
        AddHistory(document.Id, userId, "Updated", "Document updated by shared user");
        await dbContext.SaveChangesAsync();

        return Ok(ToResponseDto(document, userId));
    }

    [HttpPost]
    public async Task<ActionResult<DocumentResponseDto>> CreateDocument(DocumentCreateDto request)
    {
        var userId = GetCurrentUserId();
        var document = new Document
        {
            ShareId = await GenerateShareId(),
            Title = request.Title.Trim(),
            Content = request.Content,
            OwnerId = userId
        };

        dbContext.Documents.Add(document);
        await dbContext.SaveChangesAsync();
        AddHistory(document.Id, userId, "Created", "Document created");
        await dbContext.SaveChangesAsync();

        await dbContext.Entry(document)
            .Reference(currentDocument => currentDocument.Owner)
            .LoadAsync();

        var response = ToResponseDto(document, userId);
        return CreatedAtAction(nameof(GetDocumentById), new { id = document.Id }, response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DocumentResponseDto>> UpdateDocument(
        int id,
        DocumentUpdateDto request)
    {
        var userId = GetCurrentUserId();
        var document = await dbContext.Documents
            .Include(document => document.Owner)
            .Include(document => document.Collaborators)
            .FirstOrDefaultAsync(document =>
                document.Id == id &&
                (document.OwnerId == userId ||
                    document.Collaborators.Any(collaborator =>
                        collaborator.UserId == userId && collaborator.Role == "Editor")));

        if (document is null)
        {
            return NotFound();
        }

        UpdateDocumentFields(document, request);
        AddHistory(document.Id, userId, "Updated", "Document updated");
        await dbContext.SaveChangesAsync();

        return Ok(ToResponseDto(document, userId));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDocument(int id)
    {
        var userId = GetCurrentUserId();
        var document = await dbContext.Documents
            .FirstOrDefaultAsync(document => document.Id == id && document.OwnerId == userId);

        if (document is null)
        {
            return NotFound();
        }

        dbContext.Documents.Remove(document);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (!int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user token.");
        }

        return userId;
    }

    private async Task AddCollaboratorIfNeeded(Document document, int userId)
    {
        if (document.OwnerId == userId ||
            document.Collaborators.Any(collaborator => collaborator.UserId == userId))
        {
            return;
        }

        var collaborator = new DocumentCollaborator
        {
            DocumentId = document.Id,
            UserId = userId,
            Role = "Editor"
        };

        dbContext.DocumentCollaborators.Add(collaborator);
        document.Collaborators.Add(collaborator);
        await dbContext.SaveChangesAsync();
    }

    private async Task<bool> UserCanAccessDocument(int documentId, int userId)
    {
        return await dbContext.Documents.AnyAsync(document =>
            document.Id == documentId &&
            (document.OwnerId == userId ||
                document.Collaborators.Any(collaborator => collaborator.UserId == userId)));
    }

    private void AddHistory(int documentId, int userId, string changeType, string description)
    {
        dbContext.DocumentChangeHistory.Add(new DocumentChangeHistory
        {
            DocumentId = documentId,
            UserId = userId,
            ChangeType = changeType,
            Description = description
        });
    }

    private static void UpdateDocumentFields(Document document, DocumentUpdateDto request)
    {
        document.Title = request.Title.Trim();
        document.Content = request.Content;
        document.UpdatedAt = DateTime.UtcNow;
    }

    private async Task<string> GenerateShareId()
    {
        string shareId;

        do
        {
            shareId = Guid.NewGuid().ToString("N");
        }
        while (await dbContext.Documents.AnyAsync(document => document.ShareId == shareId));

        return shareId;
    }

    private static DocumentResponseDto ToResponseDto(Document document, int currentUserId)
    {
        var isOwner = document.OwnerId == currentUserId;
        var collaboratorRole = document.Collaborators
            .FirstOrDefault(collaborator => collaborator.UserId == currentUserId)
            ?.Role;

        return new DocumentResponseDto(
            document.Id,
            document.ShareId,
            document.OwnerId,
            document.Owner.UserName,
            isOwner,
            isOwner ? "Owner" : collaboratorRole ?? "Editor",
            document.Title,
            document.Content,
            document.CreatedAt,
            document.UpdatedAt);
    }
}

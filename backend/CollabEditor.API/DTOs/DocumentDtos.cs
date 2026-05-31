namespace CollabEditor.API.DTOs;

public record DocumentCreateDto(string Title, string Content);

public record DocumentUpdateDto(string Title, string Content);

public record DocumentResponseDto(
    int Id,
    string ShareId,
    int OwnerId,
    string OwnerUserName,
    bool IsOwner,
    string AccessRole,
    string Title,
    string Content,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record DocumentHistoryDto(
    int Id,
    string ChangeType,
    string Description,
    DateTime CreatedAt,
    string UserName);

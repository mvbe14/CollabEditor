using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace CollabEditor.API.Hubs;

[Authorize]
public class DocumentHub : Hub
{
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, string>>
        OnlineUsersByDocument = new();

    public async Task JoinDocument(string documentId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, documentId);

        var onlineUsers = OnlineUsersByDocument.GetOrAdd(
            documentId,
            _ => new ConcurrentDictionary<string, string>());

        onlineUsers[Context.ConnectionId] = GetCurrentUserName();
        await BroadcastOnlineUsers(documentId);
    }

    public async Task LeaveDocument(string documentId)
    {
        RemoveConnectionFromDocument(documentId, Context.ConnectionId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, documentId);
        await BroadcastOnlineUsers(documentId);
    }

    public async Task SendDocumentUpdate(string documentId, string content)
    {
        await Clients.OthersInGroup(documentId)
            .SendAsync("ReceiveDocumentUpdate", documentId, content);
    }

    public async Task SendCursorPosition(string documentKey, int position, string userName, string color)
    {
        await Clients.OthersInGroup(documentKey)
            .SendAsync("ReceiveCursorPosition", userName, position, color);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        foreach (var documentId in OnlineUsersByDocument.Keys)
        {
            if (RemoveConnectionFromDocument(documentId, Context.ConnectionId))
            {
                await BroadcastOnlineUsers(documentId);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private string GetCurrentUserName()
    {
        return Context.User?.FindFirst(ClaimTypes.Name)?.Value ??
            Context.User?.FindFirst(JwtRegisteredClaimNames.Email)?.Value ??
            "Unknown user";
    }

    private static bool RemoveConnectionFromDocument(string documentId, string connectionId)
    {
        if (!OnlineUsersByDocument.TryGetValue(documentId, out var onlineUsers))
        {
            return false;
        }

        var removed = onlineUsers.TryRemove(connectionId, out _);

        if (onlineUsers.IsEmpty)
        {
            OnlineUsersByDocument.TryRemove(documentId, out _);
        }

        return removed;
    }

    private async Task BroadcastOnlineUsers(string documentId)
    {
        var users = OnlineUsersByDocument.TryGetValue(documentId, out var onlineUsers)
            ? onlineUsers.Values.Distinct().OrderBy(userName => userName).ToList()
            : new List<string>();

        await Clients.Group(documentId)
            .SendAsync("ReceiveOnlineUsers", documentId, users);
    }
}

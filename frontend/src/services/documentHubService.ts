import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../api/config';
import { getAuthToken } from './authStorage';

let connection: signalR.HubConnection | null = null;

function createConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/document`, {
      accessTokenFactory: () => getAuthToken() ?? '',
    })
    .withAutomaticReconnect()
    .build();
}

export async function connectToDocument(
  documentId: string,
  onReceiveUpdate: (content: string) => void,
  onReceiveOnlineUsers: (userNames: string[]) => void,
  onReceiveCursorPosition: (
    userName: string,
    position: number,
    color: string,
  ) => void,
) {
  if (!connection) {
    connection = createConnection();
  }

  connection.off('ReceiveDocumentUpdate');
  connection.off('ReceiveOnlineUsers');
  connection.off('ReceiveCursorPosition');
  connection.on(
    'ReceiveDocumentUpdate',
    (receivedDocumentId: string, content: string) => {
      if (receivedDocumentId === documentId) {
        onReceiveUpdate(content);
      }
    },
  );
  connection.on(
    'ReceiveOnlineUsers',
    (receivedDocumentId: string, userNames: string[]) => {
      if (receivedDocumentId === documentId) {
        onReceiveOnlineUsers(userNames);
      }
    },
  );
  connection.on(
    'ReceiveCursorPosition',
    (userName: string, position: number, color: string) => {
      onReceiveCursorPosition(userName, position, color);
    },
  );

  if (connection.state === signalR.HubConnectionState.Disconnected) {
    await connection.start();
  }

  await connection.invoke('JoinDocument', documentId);
}

export async function sendDocumentUpdate(documentId: string, content: string) {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    await connection.invoke('SendDocumentUpdate', documentId, content);
  }
}

export async function sendCursorPosition(
  documentId: string,
  position: number,
  userName: string,
  color: string,
) {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    await connection.invoke('SendCursorPosition', documentId, position, userName, color);
  }
}

export async function disconnectFromDocument(documentId: string) {
  if (!connection) {
    return;
  }

  if (connection.state === signalR.HubConnectionState.Connected) {
    await connection.invoke('LeaveDocument', documentId);
    await connection.stop();
  }

  connection.off('ReceiveDocumentUpdate');
  connection.off('ReceiveOnlineUsers');
  connection.off('ReceiveCursorPosition');
  connection = null;
}

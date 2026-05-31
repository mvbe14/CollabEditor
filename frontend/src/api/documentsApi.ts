import { getAuthToken } from '../services/authStorage';
import type {
  DocumentCreateRequest,
  DocumentHistoryItem,
  DocumentResponse,
  DocumentUpdateRequest,
} from '../types/document';
import { API_BASE_URL } from './config';

async function sendDocumentRequest<T>(
  path = '',
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Please log in to manage documents.');
  }

  const response = await fetch(`${API_BASE_URL}/api/documents${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response) {
  const text = await response.text();

  if (!text) {
    return 'Request failed. Please try again.';
  }

  try {
    const error = JSON.parse(text) as { message?: string; title?: string };
    return error.message ?? error.title ?? text;
  } catch {
    return text;
  }
}

export function getDocuments() {
  return sendDocumentRequest<DocumentResponse[]>();
}

export function getDocumentById(id: number) {
  return sendDocumentRequest<DocumentResponse>(`/${id}`);
}

export function getDocumentHistory(documentId: number) {
  return sendDocumentRequest<DocumentHistoryItem[]>(`/${documentId}/history`);
}

export function getSharedDocument(shareId: string) {
  return sendDocumentRequest<DocumentResponse>(`/shared/${shareId}`);
}

export function createDocument(data: DocumentCreateRequest) {
  return sendDocumentRequest<DocumentResponse>('', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateDocument(id: number, data: DocumentUpdateRequest) {
  return sendDocumentRequest<DocumentResponse>(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function updateSharedDocument(shareId: string, data: DocumentUpdateRequest) {
  return sendDocumentRequest<DocumentResponse>(`/shared/${shareId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteDocument(id: number) {
  return sendDocumentRequest<void>(`/${id}`, {
    method: 'DELETE',
  });
}

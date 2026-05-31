import { API_BASE_URL } from './config';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth';

async function sendAuthRequest(
  path: string,
  data: LoginRequest | RegisterRequest,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response.json() as Promise<AuthResponse>;
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

export function registerUser(data: RegisterRequest) {
  return sendAuthRequest('/api/auth/register', data);
}

export function loginUser(data: LoginRequest) {
  return sendAuthRequest('/api/auth/login', data);
}

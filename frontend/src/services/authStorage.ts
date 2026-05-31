import type { AuthResponse, AuthUser } from '../types/auth';

const TOKEN_KEY = 'collabEditorToken';
const USER_KEY = 'collabEditorUser';

export function saveAuthData(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      userId: auth.userId,
      userName: auth.userName,
      email: auth.email,
    }),
  );
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const userJson = localStorage.getItem(USER_KEY);

  if (!userJson) {
    return null;
  }

  try {
    return JSON.parse(userJson) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuthData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

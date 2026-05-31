export type RegisterRequest = {
  userName: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  userId: number;
  userName: string;
  email: string;
};

export type AuthUser = {
  userId: number;
  userName: string;
  email: string;
};

export interface AuthResponse {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  avatarUrl: string;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

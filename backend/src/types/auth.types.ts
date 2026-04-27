// ─── DTO Permintaan ────────────────────────────

export interface RegisterDTO {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  age?: number;
  gender?: string;
  address?: string;
}

export interface LoginDTO {
  identifier?: string;
  email?: string;
  password: string;
}

// ─── DTO Respons ───────────────────────────

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  age: number;
  gender?: string | null;
  address?: string | null;
  isActive?: boolean;
  createdAt?: Date | null;
}

export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRY: "1h" as const,
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  BCRYPT_SALT_ROUNDS: 12,
} as const;

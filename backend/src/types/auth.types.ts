// ─── DTO Permintaan ────────────────────────────

export interface RegisterDTO {
  fullName: string;
  organizationName: string;
  email: string;
  password: string;
  phone?: string;
  age?: number;
  gender?: string;
  address?: string;
}

export interface RejectAdminApprovalDTO {
  reason?: string;
}

export interface LoginDTO {
  identifier?: string;
  email?: string;
  password: string;
}

export interface CompletePasswordChangeDTO {
  newPassword: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileDTO {
  fullName?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
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
  organizationId?: string | null;
  organizationName?: string | null;
  role: string;
  accountStatus?: string;
  age: number;
  gender?: string | null;
  address?: string | null;
  isActive?: boolean;
  approvalStatus?: string;
  mustChangePassword?: boolean | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectedReason?: string | null;
  createdAt?: Date | null;
}

export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRY: "1h" as const,
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  BCRYPT_SALT_ROUNDS: 12,
} as const;

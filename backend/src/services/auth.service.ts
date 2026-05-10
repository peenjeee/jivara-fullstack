import { db } from "../db";
import { organizations, patients, users, refreshTokens } from "../db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { writeAuditLog } from "./audit-log.service";
import {
  RegisterDTO,
  LoginDTO,
  ChangePasswordDTO,
  CompletePasswordChangeDTO,
  RejectAdminApprovalDTO,
  UpdateProfileDTO,
  TokenPayload,
  AUTH_CONSTANTS,
} from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET as string;

// ─── Utilitas Token ─────────────────────────

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
  });
};

export const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({ userId, token, expiresAt });
  return token;
};

const publicUserFields = {
  id: users.id,
  organizationId: users.organizationId,
  fullName: users.fullName,
  email: users.email,
  phone: users.phone,
  role: users.role,
  accountStatus: users.accountStatus,
  age: users.age,
  gender: users.gender,
  address: users.address,
  mustChangePassword: users.mustChangePassword,
  approvedBy: users.approvedBy,
  approvedAt: users.approvedAt,
  rejectedAt: users.rejectedAt,
  rejectedReason: users.rejectedReason,
  createdAt: users.createdAt,
};

/**
 * Public register hanya membuat calon admin berstatus pending.
 */
export const registerUser = async (dto: RegisterDTO) => {
  // Cek pengguna yang sudah ada
  const conditions = [eq(users.email, dto.email)];
  if (dto.phone) {
    conditions.push(eq(users.phone, dto.phone));
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(or(...conditions))
    .limit(1);

  if (existingUser.length > 0) {
    throw { status: 409, message: "Nomor telepon atau email sudah terdaftar", code: "USER_EXISTS" };
  }

  const hashedPassword = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

  const newUser = await db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({ name: dto.organizationName.trim() })
      .returning({ id: organizations.id, name: organizations.name });

    const [user] = await tx
      .insert(users)
      .values({
        organizationId: organization.id,
        fullName: dto.fullName,
        email: dto.email,
        password: hashedPassword,
        role: "admin",
        accountStatus: "pending",
        phone: dto.phone || null,
        gender: dto.gender || null,
        address: dto.address || null,
        age: dto.age || 0,
        mustChangePassword: false,
      })
      .returning({
        id: users.id,
        organizationId: users.organizationId,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        accountStatus: users.accountStatus,
        createdAt: users.createdAt,
      });

    return { ...user, organizationName: organization.name };
  });

  await writeAuditLog({
    userId: newUser.id,
    action: "auth.register.pending",
    resourceType: "user",
    resourceId: newUser.id,
    changes: { after: { id: newUser.id, email: newUser.email, role: newUser.role, accountStatus: newUser.accountStatus, organizationId: newUser.organizationId } },
  });

  return newUser;
};

export const listPendingRegistrations = async () => {
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      age: users.age,
      gender: users.gender,
      address: users.address,
      accountStatus: users.accountStatus,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.accountStatus, "pending"));
};

export const approveRegistration = async (userId: string, approvedBy?: string) => {
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (existing.length === 0) {
    throw { status: 404, message: "Pengguna tidak ditemukan", code: "USER_NOT_FOUND" };
  }

  if (existing[0].accountStatus !== "pending") {
    throw { status: 400, message: "Registrasi pengguna ini tidak sedang menunggu persetujuan", code: "REGISTRATION_NOT_PENDING" };
  }

  const [approvedUser] = await db
    .update(users)
    .set({ accountStatus: "active", isActive: true, approvedBy: approvedBy || null, approvedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      accountStatus: users.accountStatus,
      isActive: users.isActive,
    });

  await writeAuditLog({
    userId: approvedBy || null,
    action: "auth.register.approved",
    resourceType: "user",
    resourceId: userId,
    changes: { before: { accountStatus: existing[0].accountStatus, isActive: existing[0].isActive }, after: { accountStatus: "active", isActive: true } },
  });

  return approvedUser;
};

export const rejectRegistration = async (userId: string, rejectedBy?: string) => {
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (existing.length === 0) {
    throw { status: 404, message: "Pengguna tidak ditemukan", code: "USER_NOT_FOUND" };
  }

  if (existing[0].accountStatus !== "pending") {
    throw { status: 400, message: "Registrasi pengguna ini tidak sedang menunggu persetujuan", code: "REGISTRATION_NOT_PENDING" };
  }

  const [rejectedUser] = await db
    .update(users)
    .set({ accountStatus: "rejected", rejectedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      isActive: users.isActive,
    });

  await writeAuditLog({
    userId: rejectedBy || null,
    action: "auth.register.rejected",
    resourceType: "user",
    resourceId: userId,
    changes: { before: { accountStatus: existing[0].accountStatus, isActive: existing[0].isActive }, after: { accountStatus: "rejected" } },
  });

  return rejectedUser;
};

/**
 * Autentikasi pengguna dengan email/telepon + kata sandi.
 */
export const loginUser = async (dto: LoginDTO) => {
  const loginId = dto.identifier || dto.email;
  if (!loginId) {
    throw { status: 400, message: "Email/nomor telepon wajib diisi", code: "MISSING_IDENTIFIER" };
  }

  const user = await db
    .select()
    .from(users)
    .where(or(eq(users.email, loginId), eq(users.phone, loginId)))
    .limit(1);

  if (user.length === 0) {
    throw { status: 400, message: "Email/nomor telepon atau kata sandi salah", code: "INVALID_CREDENTIALS" };
  }

  const foundUser = user[0];

  if (!foundUser.isActive) {
    throw { status: 403, message: "Akun telah dinonaktifkan", code: "ACCOUNT_DEACTIVATED" };
  }

  const isPasswordValid = await bcrypt.compare(dto.password, foundUser.password);
  if (!isPasswordValid) {
    throw { status: 400, message: "Email/nomor telepon atau kata sandi salah", code: "INVALID_CREDENTIALS" };
  }

  const accessToken = generateAccessToken({
    id: foundUser.id,
    email: foundUser.email,
    role: foundUser.role,
  });
  const refreshToken = await generateRefreshToken(foundUser.id);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer" as const,
    expires_in: 3600,
    user: {
      id: foundUser.id,
      organizationId: foundUser.organizationId,
      fullName: foundUser.fullName,
      email: foundUser.email,
      phone: foundUser.phone,
      role: foundUser.role,
      accountStatus: foundUser.accountStatus,
      age: foundUser.age,
      gender: foundUser.gender,
      address: foundUser.address,
      mustChangePassword: foundUser.mustChangePassword,
      rejectedReason: foundUser.rejectedReason,
    },
  };
};

export const listPendingAdminApprovals = async () => {
  return db
    .select(publicUserFields)
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(desc(users.createdAt));
};

export const getAdminApprovalSummary = async () => {
  const admins = await db
    .select({ accountStatus: users.accountStatus })
    .from(users)
    .where(eq(users.role, "admin"));

  return admins.reduce(
    (summary, user) => {
      if (user.accountStatus === "pending") summary.pending += 1;
      else if (user.accountStatus === "rejected") summary.rejected += 1;
      else if (user.accountStatus === "suspended") summary.suspended += 1;
      else summary.active += 1;
      return summary;
    },
    { pending: 0, active: 0, rejected: 0, suspended: 0 }
  );
};

export const approveAdminApproval = async (adminId: string, approverId: string | null) => {
  const [updatedUser] = await db
    .update(users)
    .set({
      accountStatus: "active",
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectedAt: null,
      rejectedReason: null,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, adminId), eq(users.role, "admin"), eq(users.accountStatus, "pending")))
    .returning(publicUserFields);

  if (!updatedUser) {
    throw { status: 404, message: "Pengajuan admin tidak ditemukan atau sudah diproses", code: "APPROVAL_NOT_FOUND" };
  }

  await writeAuditLog({
    userId: approverId,
    action: "admin.approved",
    resourceType: "admin_approval",
    resourceId: updatedUser.id,
    changes: { after: { accountStatus: updatedUser.accountStatus, email: updatedUser.email, fullName: updatedUser.fullName } },
  });

  return updatedUser;
};

export const rejectAdminApproval = async (adminId: string, dto: RejectAdminApprovalDTO, rejectedBy: string | null = null) => {
  const [updatedUser] = await db
    .update(users)
    .set({
      accountStatus: "rejected",
      rejectedAt: new Date(),
      rejectedReason: dto.reason?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, adminId), eq(users.role, "admin"), eq(users.accountStatus, "pending")))
    .returning(publicUserFields);

  if (!updatedUser) {
    throw { status: 404, message: "Pengajuan admin tidak ditemukan atau sudah diproses", code: "APPROVAL_NOT_FOUND" };
  }

  await writeAuditLog({
    userId: rejectedBy,
    action: "admin.rejected",
    resourceType: "admin_approval",
    resourceId: updatedUser.id,
    changes: { after: { accountStatus: updatedUser.accountStatus, email: updatedUser.email, fullName: updatedUser.fullName, reason: updatedUser.rejectedReason } },
  });

  return updatedUser;
};

export const activateSuspendedAdmin = async (adminId: string, approverId: string | null) => {
  const [updatedUser] = await db
    .update(users)
    .set({
      accountStatus: "active",
      approvedBy: approverId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, adminId), eq(users.role, "admin"), eq(users.accountStatus, "suspended")))
    .returning(publicUserFields);

  if (!updatedUser) {
    throw { status: 404, message: "Admin suspend tidak ditemukan", code: "SUSPENDED_ADMIN_NOT_FOUND" };
  }

  await writeAuditLog({
    userId: approverId,
    action: "admin.activated",
    resourceType: "admin_approval",
    resourceId: updatedUser.id,
    changes: { after: { accountStatus: updatedUser.accountStatus, email: updatedUser.email, fullName: updatedUser.fullName } },
  });

  return updatedUser;
};

export const restoreRejectedAdmin = async (adminId: string, restoredBy: string | null = null) => {
  const [updatedUser] = await db
    .update(users)
    .set({
      accountStatus: "pending",
      rejectedAt: null,
      rejectedReason: null,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, adminId), eq(users.role, "admin"), eq(users.accountStatus, "rejected")))
    .returning(publicUserFields);

  if (!updatedUser) {
    throw { status: 404, message: "Admin ditolak tidak ditemukan", code: "REJECTED_ADMIN_NOT_FOUND" };
  }

  await writeAuditLog({
    userId: restoredBy,
    action: "admin.restored",
    resourceType: "admin_approval",
    resourceId: updatedUser.id,
    changes: { after: { accountStatus: updatedUser.accountStatus, email: updatedUser.email, fullName: updatedUser.fullName } },
  });

  return updatedUser;
};

export const suspendActiveAdmin = async (adminId: string, suspendedBy: string | null = null) => {
  const [updatedUser] = await db
    .update(users)
    .set({
      accountStatus: "suspended",
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, adminId), eq(users.role, "admin"), eq(users.accountStatus, "active")))
    .returning(publicUserFields);

  if (!updatedUser) {
    throw { status: 404, message: "Admin aktif tidak ditemukan", code: "ACTIVE_ADMIN_NOT_FOUND" };
  }

  await writeAuditLog({
    userId: suspendedBy,
    action: "admin.suspended",
    resourceType: "admin_approval",
    resourceId: updatedUser.id,
    changes: { after: { accountStatus: updatedUser.accountStatus, email: updatedUser.email, fullName: updatedUser.fullName } },
  });

  return updatedUser;
};

export const completePasswordChange = async (userId: string, dto: CompletePasswordChangeDTO) => {
  const user = await db
    .select({ id: users.id, mustChangePassword: users.mustChangePassword })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw { status: 404, message: "Pengguna tidak ditemukan", code: "NOT_FOUND" };
  }

  if (!user[0].mustChangePassword) {
    throw { status: 400, message: "Akun ini tidak wajib mengganti kata sandi", code: "PASSWORD_CHANGE_NOT_REQUIRED" };
  }

  const hashedPassword = await bcrypt.hash(dto.newPassword, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

  const [updatedUser] = await db
    .update(users)
    .set({ password: hashedPassword, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      organizationId: users.organizationId,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      accountStatus: users.accountStatus,
      age: users.age,
      gender: users.gender,
      address: users.address,
      mustChangePassword: users.mustChangePassword,
    });

  return updatedUser;
};

export const changePassword = async (userId: string, dto: ChangePasswordDTO) => {
  const user = await db
    .select({ id: users.id, password: users.password })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw { status: 404, message: "Pengguna tidak ditemukan", code: "NOT_FOUND" };
  }

  const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user[0].password);
  if (!isCurrentPasswordValid) {
    throw { status: 400, message: "Kata sandi saat ini tidak sesuai", code: "INVALID_CURRENT_PASSWORD" };
  }

  const isSamePassword = await bcrypt.compare(dto.newPassword, user[0].password);
  if (isSamePassword) {
    throw { status: 400, message: "Kata sandi baru harus berbeda dari kata sandi saat ini", code: "PASSWORD_REUSED" };
  }

  const hashedPassword = await bcrypt.hash(dto.newPassword, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

  await db
    .update(users)
    .set({ password: hashedPassword, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await writeAuditLog({
    userId,
    action: "auth.password.changed",
    resourceType: "user",
    resourceId: userId,
    changes: { after: { passwordChanged: true } },
  });

  return getUserProfile(userId);
};

/**
 * Perbarui access token menggunakan string refresh token yang valid.
 */
export const refreshAccessToken = async (token: string) => {
  const storedToken = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, token))
    .limit(1);

  if (storedToken.length === 0) {
    throw { status: 401, message: "Token refresh tidak valid", code: "INVALID_TOKEN" };
  }

  if (new Date() > storedToken[0].expiresAt) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken[0].id));
    throw { status: 401, message: "Token refresh telah kedaluwarsa", code: "TOKEN_EXPIRED" };
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, storedToken[0].userId))
    .limit(1);

  if (user.length === 0) {
    throw { status: 401, message: "Pengguna tidak ditemukan", code: "INVALID_TOKEN" };
  }

  if (user[0].role === "admin" && user[0].accountStatus !== "active") {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken[0].id));
    throw { status: 403, message: "Akun belum disetujui administrator", code: "ACCOUNT_NOT_APPROVED" };
  }

  if (!user[0].isActive) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken[0].id));
    throw { status: 403, message: "Akun telah dinonaktifkan", code: "ACCOUNT_DEACTIVATED" };
  }

  const accessToken = generateAccessToken({
    id: user[0].id,
    email: user[0].email,
    role: user[0].role,
  });

  return { access_token: accessToken, expires_in: 3600 };
};

export const getUserProfileByRefreshToken = async (token: string) => {
  const storedToken = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, token))
    .limit(1);

  if (storedToken.length === 0) {
    throw { status: 401, message: "Token refresh tidak valid", code: "INVALID_TOKEN" };
  }

  if (new Date() > storedToken[0].expiresAt) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken[0].id));
    throw { status: 401, message: "Token refresh telah kedaluwarsa", code: "TOKEN_EXPIRED" };
  }

  return getUserProfile(storedToken[0].userId);
};

export const updateUserProfile = async (userId: string, dto: UpdateProfileDTO) => {
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (existing.length === 0) {
    throw { status: 404, message: "Pengguna tidak ditemukan", code: "NOT_FOUND" };
  }

  const fullName = dto.fullName?.trim();
  const email = dto.email?.trim().toLowerCase();
  const phone = dto.phone === undefined ? undefined : dto.phone?.trim() || null;
  const address = dto.address === undefined ? undefined : dto.address?.trim() || null;

  if (fullName !== undefined && fullName.length < 2) {
    throw { status: 400, message: "Nama lengkap minimal harus 2 karakter", code: "VALIDATION_ERROR" };
  }

  if (email || phone) {
    const conditions = [];
    if (email) conditions.push(eq(users.email, email));
    if (phone) conditions.push(eq(users.phone, phone));

    const duplicateUsers = await db.select({ id: users.id }).from(users).where(or(...conditions));
    if (duplicateUsers.some((user) => user.id !== userId)) {
      throw { status: 409, message: "Email atau nomor telepon sudah digunakan", code: "USER_EXISTS" };
    }
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;

  if (Object.keys(updates).length === 0) return getUserProfile(userId);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, userId));

    if (existing[0].role === "patient" && address !== undefined) {
      await tx.update(patients).set({ address }).where(eq(patients.userId, userId));
    }
  });

  await writeAuditLog({
    userId,
    action: "auth.profile.updated",
    resourceType: "user",
    resourceId: userId,
    changes: { before: { fullName: existing[0].fullName, email: existing[0].email, phone: existing[0].phone, address: existing[0].address }, after: updates },
  });

  return getUserProfile(userId);
};

/**
 * Invalidasi refresh token (logout).
 */
export const invalidateRefreshToken = async (token: string) => {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
};

/**
 * Ambil profil pengguna saat ini berdasarkan ID.
 */
export const getUserProfile = async (userId: string) => {
  const user = await db
    .select({
      id: users.id,
      organizationId: users.organizationId,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      accountStatus: users.accountStatus,
      age: users.age,
      gender: users.gender,
      address: users.address,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      approvedBy: users.approvedBy,
      approvedAt: users.approvedAt,
      rejectedAt: users.rejectedAt,
      rejectedReason: users.rejectedReason,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw { status: 404, message: "Pengguna tidak ditemukan", code: "NOT_FOUND" };
  }

  return user[0];
};

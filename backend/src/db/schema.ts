import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  date,
  jsonb,
  real,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────
// 1. USERS
// ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 256 }).notNull(),
  phone: varchar("phone", { length: 20 }).unique(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("nurse"),
  age: integer("age").notNull().default(0),
  gender: varchar("gender", { length: 10 }),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  mustChangePassword: boolean("must_change_password").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  roleIdx: index("idx_users_role").on(table.role),
  phoneIdx: index("idx_users_phone").on(table.phone),
}));

// ─────────────────────────────────────────────
// 2. REFRESH TOKENS
// ─────────────────────────────────────────────
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
// 3. PATIENTS
// ─────────────────────────────────────────────
export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 10 }),
  address: text("address"),
  diagnosis: text("diagnosis"),
  emergencyContact: jsonb("emergency_contact"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("idx_patients_user").on(table.userId),
}));

// ─────────────────────────────────────────────
// 4. NURSES
// ─────────────────────────────────────────────
export const nurses = pgTable("nurses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id", { length: 64 }),
  department: varchar("department", { length: 128 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("idx_nurses_user").on(table.userId),
}));

// ─────────────────────────────────────────────
// 5. PATIENT-NURSE ASSIGNMENTS
// ─────────────────────────────────────────────
export const patientNurseAssignments = pgTable("patient_nurse_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  nurseId: uuid("nurse_id")
    .notNull()
    .references(() => nurses.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: uuid("assigned_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  patientIdx: index("idx_assignments_patient").on(table.patientId),
  nurseIdx: index("idx_assignments_nurse").on(table.nurseId),
}));

// ─────────────────────────────────────────────
// 6. PRESCRIPTIONS
// ─────────────────────────────────────────────
export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  diagnosis: text("diagnosis"),
  prescribingDoctor: varchar("prescribing_doctor", { length: 256 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (table) => ({
  patientIdx: index("idx_prescriptions_patient").on(table.patientId),
}));

// ─────────────────────────────────────────────
// 7. MEDICATION SCHEDULES
// ─────────────────────────────────────────────
export const medicationSchedules = pgTable("medication_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id, { onDelete: "set null" }),
  drugName: varchar("drug_name", { length: 256 }).notNull(),
  dosage: varchar("dosage", { length: 64 }).notNull(),
  frequency: integer("frequency").notNull(),
  scheduledTimes: jsonb("scheduled_times").notNull(),
  instructions: text("instructions"),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  patientIdx: index("idx_med_sched_patient").on(table.patientId),
  activeIdx: index("idx_med_sched_active").on(table.isActive),
}));

// ─────────────────────────────────────────────
// 8. MEDICATION LOGS
// ─────────────────────────────────────────────
export const medicationLogs = pgTable("medication_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  scheduleId: uuid("schedule_id")
    .notNull()
    .references(() => medicationSchedules.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  scheduledTime: timestamp("scheduled_time").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  confirmedAt: timestamp("confirmed_at"),
  snoozeCount: integer("snooze_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  patientIdx: index("idx_med_logs_patient").on(table.patientId),
  statusIdx: index("idx_med_logs_status").on(table.status),
  dateIdx: index("idx_med_logs_date").on(table.scheduledTime),
}));

// ─────────────────────────────────────────────
// 9. FOOD SCANS
// ─────────────────────────────────────────────
export const foodScans = pgTable("food_scans", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  imageSizeKb: integer("image_size_kb"),
  inferenceTimeMs: real("inference_time_ms"),
  modelVersion: varchar("model_version", { length: 64 }),
  overallRiskScore: real("overall_risk_score"),
  overallRiskLevel: varchar("overall_risk_level", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  patientIdx: index("idx_food_scans_patient").on(table.patientId),
  dateIdx: index("idx_food_scans_date").on(table.createdAt),
}));

// ─────────────────────────────────────────────
// 10. DETECTED ITEMS
// ─────────────────────────────────────────────
export const detectedItems = pgTable("detected_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => foodScans.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 128 }).notNull(),
  labelDisplay: varchar("label_display", { length: 256 }).notNull(),
  confidence: real("confidence").notNull(),
  boundingBox: jsonb("bounding_box"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  scanIdx: index("idx_detected_items_scan").on(table.scanId),
}));

// ─────────────────────────────────────────────
// 11. INTERACTION RESULTS
// ─────────────────────────────────────────────
export const interactionResults = pgTable("interaction_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => foodScans.id, { onDelete: "cascade" }),
  foodItem: varchar("food_item", { length: 128 }).notNull(),
  medication: varchar("medication", { length: 256 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  interactionDescription: text("interaction_description"),
  recommendation: text("recommendation"),
  sources: jsonb("sources"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  scanIdx: index("idx_interaction_results_scan").on(table.scanId),
}));

// ─────────────────────────────────────────────
// 12. NOTIFICATIONS
// ─────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  body: text("body").notNull(),
  data: jsonb("data"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  urgency: varchar("urgency", { length: 20 }).notNull().default("normal"),
  scheduledAt: timestamp("scheduled_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  patientIdx: index("idx_notifications_patient").on(table.patientId),
  statusIdx: index("idx_notifications_status").on(table.status),
}));

// ─────────────────────────────────────────────
// 13. PUSH SUBSCRIPTIONS
// ─────────────────────────────────────────────
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  patientIdx: index("idx_push_subscriptions_patient").on(table.patientId),
  enabledIdx: index("idx_push_subscriptions_enabled").on(table.isEnabled),
}));

// ─────────────────────────────────────────────
// 14. AUDIT LOGS
// ─────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 64 }).notNull(),
  resourceType: varchar("resource_type", { length: 64 }).notNull(),
  resourceId: uuid("resource_id"),
  changes: jsonb("changes"),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("idx_audit_user").on(table.userId),
  resourceIdx: index("idx_audit_resource").on(table.resourceType, table.resourceId),
  dateIdx: index("idx_audit_date").on(table.createdAt),
}));

// ─────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  patients: many(patients),
  nurses: many(nurses),
  pushSubscriptions: many(pushSubscriptions),
  auditLogs: many(auditLogs),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  assignments: many(patientNurseAssignments),
  prescriptions: many(prescriptions),
  medicationSchedules: many(medicationSchedules),
  medicationLogs: many(medicationLogs),
  foodScans: many(foodScans),
  notifications: many(notifications),
  pushSubscriptions: many(pushSubscriptions),
}));

export const nursesRelations = relations(nurses, ({ one, many }) => ({
  user: one(users, {
    fields: [nurses.userId],
    references: [users.id],
  }),
  assignments: many(patientNurseAssignments),
}));

export const patientNurseAssignmentsRelations = relations(patientNurseAssignments, ({ one }) => ({
  patient: one(patients, {
    fields: [patientNurseAssignments.patientId],
    references: [patients.id],
  }),
  nurse: one(nurses, {
    fields: [patientNurseAssignments.nurseId],
    references: [nurses.id],
  }),
  assignedByUser: one(users, {
    fields: [patientNurseAssignments.assignedBy],
    references: [users.id],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  medicationSchedules: many(medicationSchedules),
}));

export const medicationSchedulesRelations = relations(medicationSchedules, ({ one, many }) => ({
  patient: one(patients, {
    fields: [medicationSchedules.patientId],
    references: [patients.id],
  }),
  prescription: one(prescriptions, {
    fields: [medicationSchedules.prescriptionId],
    references: [prescriptions.id],
  }),
  logs: many(medicationLogs),
}));

export const medicationLogsRelations = relations(medicationLogs, ({ one }) => ({
  schedule: one(medicationSchedules, {
    fields: [medicationLogs.scheduleId],
    references: [medicationSchedules.id],
  }),
  patient: one(patients, {
    fields: [medicationLogs.patientId],
    references: [patients.id],
  }),
}));

export const foodScansRelations = relations(foodScans, ({ one, many }) => ({
  patient: one(patients, {
    fields: [foodScans.patientId],
    references: [patients.id],
  }),
  detectedItems: many(detectedItems),
  interactionResults: many(interactionResults),
}));

export const detectedItemsRelations = relations(detectedItems, ({ one }) => ({
  scan: one(foodScans, {
    fields: [detectedItems.scanId],
    references: [foodScans.id],
  }),
}));

export const interactionResultsRelations = relations(interactionResults, ({ one }) => ({
  scan: one(foodScans, {
    fields: [interactionResults.scanId],
    references: [foodScans.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  patient: one(patients, {
    fields: [notifications.patientId],
    references: [patients.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  patient: one(patients, {
    fields: [pushSubscriptions.patientId],
    references: [patients.id],
  }),
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

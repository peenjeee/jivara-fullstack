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
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────
// 1. ORGANIZATIONS
// ─────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────
// 2. USERS
// ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  fullName: varchar("full_name", { length: 256 }).notNull(),
  phone: varchar("phone", { length: 20 }).unique(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("nurse"),
  accountStatus: varchar("account_status", { length: 20 }).notNull().default("active"),
  age: integer("age").notNull().default(0),
  gender: varchar("gender", { length: 10 }),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  mustChangePassword: boolean("must_change_password").default(false),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectedReason: text("rejected_reason"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  organizationIdx: index("idx_users_organization").on(table.organizationId),
  roleIdx: index("idx_users_role").on(table.role),
  accountStatusIdx: index("idx_users_account_status").on(table.accountStatus),
  phoneIdx: index("idx_users_phone").on(table.phone),
}));

// ─────────────────────────────────────────────
// 3. REFRESH TOKENS
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
// 4. PATIENTS
// ─────────────────────────────────────────────
export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
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
  organizationIdx: index("idx_patients_organization").on(table.organizationId),
  userIdx: index("idx_patients_user").on(table.userId),
  organizationActiveCreatedIdx: index("idx_patients_org_active_created").on(table.organizationId, table.isActive, table.createdAt),
}));

// ─────────────────────────────────────────────
// 5. NURSES
// ─────────────────────────────────────────────
export const nurses = pgTable("nurses", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id", { length: 64 }),
  department: varchar("department", { length: 128 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  organizationIdx: index("idx_nurses_organization").on(table.organizationId),
  userIdx: index("idx_nurses_user").on(table.userId),
  organizationActiveCreatedIdx: index("idx_nurses_org_active_created").on(table.organizationId, table.isActive, table.createdAt),
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
  activePatientIdx: index("idx_assignments_active_patient").on(table.patientId, table.isActive),
  activeNurseIdx: index("idx_assignments_active_nurse").on(table.nurseId, table.isActive),
}));

// ─────────────────────────────────────────────
// 6. MEDICINE CATALOG
// ─────────────────────────────────────────────
export const medicineCatalog = pgTable("medicine_catalog", {
  id: uuid("id").defaultRandom().primaryKey(),
  registrationNumber: varchar("nomor_registrasi", { length: 128 }).notNull().unique(),
  productName: varchar("nama_produk", { length: 256 }).notNull(),
  compositionNormalized: text("komposisi_normalized"),
  activeSubstances: text("list_zat_aktif"),
  drugCategories: text("all_drug_categories"),
  dosageFormGroup: varchar("kelompok_bentuk_sediaan", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  productNameIdx: index("idx_medicine_catalog_product_name").on(table.productName),
  registrationNumberIdx: index("idx_medicine_catalog_registration_number").on(table.registrationNumber),
  dosageFormGroupIdx: index("idx_medicine_catalog_dosage_form_group").on(table.dosageFormGroup),
}));

// ─────────────────────────────────────────────
// 7. MEDICATION SCHEDULES
// ─────────────────────────────────────────────
export const medicationSchedules = pgTable("medication_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  drugName: varchar("drug_name", { length: 256 }).notNull(),
  registrationNumber: varchar("registration_number", { length: 128 }),
  compositionNormalized: text("composition_normalized"),
  activeSubstances: text("active_substances"),
  drugCategories: text("drug_categories"),
  dosage: varchar("dosage", { length: 64 }).notNull(),
  medicineForm: varchar("medicine_form", { length: 32 }).default("Tablet"),
  mealRule: varchar("meal_rule", { length: 64 }).default("Tidak tergantung makan"),
  stock: integer("stock").default(0),
  frequency: integer("frequency").notNull(),
  scheduledTimes: jsonb("scheduled_times").notNull(),
  instructions: text("instructions"),
  reminderEnabled: boolean("reminder_enabled").default(true),
  isActive: boolean("is_active").default(true),
  completedAt: timestamp("completed_at"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  patientIdx: index("idx_med_sched_patient").on(table.patientId),
  activeIdx: index("idx_med_sched_active").on(table.isActive),
  patientActiveCreatedIdx: index("idx_med_sched_patient_active_created").on(table.patientId, table.isActive, table.createdAt),
}));

// ─────────────────────────────────────────────
// 7. MEDICATION LOGS
// ─────────────────────────────────────────────
export const medicationLogs = pgTable("medication_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  scheduleId: uuid("schedule_id")
    .notNull()
    .references(() => medicationSchedules.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  reminderJobId: uuid("reminder_job_id"),
  scheduledTime: timestamp("scheduled_time").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  confirmedAt: timestamp("confirmed_at"),
  snoozeCount: integer("snooze_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  patientIdx: index("idx_med_logs_patient").on(table.patientId),
  statusIdx: index("idx_med_logs_status").on(table.status),
  dateIdx: index("idx_med_logs_date").on(table.scheduledTime),
  reminderJobIdx: index("idx_med_logs_reminder_job").on(table.reminderJobId),
  patientTimeIdx: index("idx_med_logs_patient_time").on(table.patientId, table.scheduledTime),
  scheduleTimeStatusIdx: index("idx_med_logs_schedule_time_status").on(table.scheduleId, table.scheduledTime, table.status),
  uniqueScheduleTime: uniqueIndex("uq_med_logs_schedule_time").on(table.scheduleId, table.scheduledTime),
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
  recommendedFoods: jsonb("recommended_foods"),
  foodsToAvoid: jsonb("foods_to_avoid"),
  recommendationSummary: jsonb("recommendation_summary"),
  nutritionItems: jsonb("nutrition_items"),
  nutritionTotal: jsonb("nutrition_total"),
  matchedMedicationCategories: jsonb("matched_medication_categories"),
  recommendationPatientMedications: jsonb("recommendation_patient_medications"),
  analyzedMedicationCount: integer("analyzed_medication_count"),
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
  patientStatusCreatedIdx: index("idx_notifications_patient_status_created").on(table.patientId, table.status, table.createdAt),
}));

// ─────────────────────────────────────────────
// 13. MEDICATION REMINDER JOBS
// ─────────────────────────────────────────────
export const medicationReminderJobs = pgTable("medication_reminder_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  scheduleId: uuid("schedule_id")
    .notNull()
    .references(() => medicationSchedules.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  notificationId: uuid("notification_id").references(() => notifications.id, { onDelete: "set null" }),
  scheduledTime: timestamp("scheduled_time").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueScheduleTime: uniqueIndex("uq_med_reminder_schedule_time").on(table.scheduleId, table.scheduledTime),
  patientIdx: index("idx_med_reminder_jobs_patient").on(table.patientId),
  dueIdx: index("idx_med_reminder_jobs_due").on(table.status, table.scheduledTime),
  patientStatusUpdatedIdx: index("idx_med_reminder_jobs_patient_status_updated").on(table.patientId, table.status, table.updatedAt),
}));

// ─────────────────────────────────────────────
// 14. PUSH SUBSCRIPTIONS
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

export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  preferenceKey: varchar("preference_key", { length: 64 }).notNull(),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("idx_user_notification_preferences_user").on(table.userId),
  uniqueUserPreference: uniqueIndex("uq_user_notification_preferences_user_key").on(table.userId, table.preferenceKey),
}));

export const userPushSubscriptions = pgTable("user_push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
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
  userIdx: index("idx_user_push_subscriptions_user").on(table.userId),
  enabledIdx: index("idx_user_push_subscriptions_enabled").on(table.isEnabled),
}));

// ─────────────────────────────────────────────
// 15. AUDIT LOGS
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
  actionDateIdx: index("idx_audit_action_date").on(table.action, table.createdAt),
}));

export const activityReads = pgTable("activity_reads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityId: varchar("activity_id", { length: 128 }).notNull(),
  readAt: timestamp("read_at").defaultNow(),
}, (table) => ({
  userIdx: index("idx_activity_reads_user").on(table.userId),
  uniqueUserActivity: uniqueIndex("uq_activity_reads_user_activity").on(table.userId, table.activityId),
}));

// ─────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  patients: many(patients),
  nurses: many(nurses),
  pushSubscriptions: many(pushSubscriptions),
  userPushSubscriptions: many(userPushSubscriptions),
  notificationPreferences: many(userNotificationPreferences),
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
  medicationSchedules: many(medicationSchedules),
  medicationLogs: many(medicationLogs),
  medicationReminderJobs: many(medicationReminderJobs),
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

export const medicationSchedulesRelations = relations(medicationSchedules, ({ one, many }) => ({
  patient: one(patients, {
    fields: [medicationSchedules.patientId],
    references: [patients.id],
  }),
  logs: many(medicationLogs),
  reminderJobs: many(medicationReminderJobs),
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

export const medicationReminderJobsRelations = relations(medicationReminderJobs, ({ one }) => ({
  schedule: one(medicationSchedules, {
    fields: [medicationReminderJobs.scheduleId],
    references: [medicationSchedules.id],
  }),
  patient: one(patients, {
    fields: [medicationReminderJobs.patientId],
    references: [patients.id],
  }),
  notification: one(notifications, {
    fields: [medicationReminderJobs.notificationId],
    references: [notifications.id],
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

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userNotificationPreferences.userId],
    references: [users.id],
  }),
}));

export const userPushSubscriptionsRelations = relations(userPushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userPushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

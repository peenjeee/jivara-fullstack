import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "../db";
import { medicationLogs, medicationReminderJobs, medicationSchedules } from "../db/schema";
import { deleteCachedByPrefix, invalidateAdherenceCache, invalidateDashboardCache, invalidatePatientReadCache } from "./cache.service";
import { sendCareTeamCriticalPushNotification, sendPushNotification } from "./notification.service";

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_LOOKBACK_MINUTES = 2;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const PRE_REMINDER_MINUTES = 10;
const URGENT_AFTER_MINUTES = 30;

let intervalHandle: NodeJS.Timeout | null = null;
let isProcessing = false;

const getIntervalMs = () => Math.max(Number(process.env.REMINDER_SCHEDULER_INTERVAL_MS || DEFAULT_INTERVAL_MS), 10_000);

const getLookbackMinutes = () => Math.max(Number(process.env.REMINDER_LOOKBACK_MINUTES || DEFAULT_LOOKBACK_MINUTES), 1);

const pad = (value: number) => String(value).padStart(2, "0");

const getJakartaDate = (date: Date) => new Date(date.getTime() + JAKARTA_OFFSET_MS);

const getClockDateKey = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const getDateKey = (date: Date) => {
  const jakartaDate = getJakartaDate(date);
  return getClockDateKey(jakartaDate);
};

const getJakartaTimeLabel = (date: Date) => `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;

const parseScheduledTimes = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value.filter((time): time is string => typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time));
};

const toScheduledDate = (dateKey: string, time: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
};

const getEndOfJakartaDay = (date: Date) => toScheduledDate(getClockDateKey(date), "23:59");

const getPreReminderTime = (scheduledTime: Date) => new Date(scheduledTime.getTime() - PRE_REMINDER_MINUTES * 60_000);

const getMissedAt = (schedule: typeof medicationSchedules.$inferSelect, scheduledTime: Date) => {
  const scheduledTimes = parseScheduledTimes(schedule.scheduledTimes).sort();
  const dateKey = getClockDateKey(scheduledTime);
  const currentTime = getJakartaTimeLabel(scheduledTime);
  const nextSameDayTime = scheduledTimes.find((time) => time > currentTime);

  if (nextSameDayTime) return toScheduledDate(dateKey, nextSameDayTime);

  return getEndOfJakartaDay(scheduledTime);
};

const isDue = (scheduledTime: Date, now: Date, lookbackMinutes: number) => {
  const earliest = new Date(now.getTime() - lookbackMinutes * 60_000);
  return scheduledTime >= earliest && scheduledTime <= now;
};

const createReminderJob = async (schedule: typeof medicationSchedules.$inferSelect, scheduledTime: Date) => {
  const rows = await db
    .insert(medicationReminderJobs)
    .values({
      scheduleId: schedule.id,
      patientId: schedule.patientId,
      scheduledTime,
      status: "pending",
    })
    .onConflictDoNothing()
    .returning();

  return rows[0] || null;
};

const markJobFailed = async (jobId: string, error: unknown) => {
  const message = error instanceof Error ? error.message : "Gagal mengirim reminder";

  await db
    .update(medicationReminderJobs)
    .set({ status: "failed", attempts: 1, lastError: message.slice(0, 1000), updatedAt: new Date() })
    .where(eq(medicationReminderJobs.id, jobId));
};

const sendPreReminderForJob = async (job: typeof medicationReminderJobs.$inferSelect, schedule: typeof medicationSchedules.$inferSelect) => {
  const result = await sendPushNotification({
    patientId: job.patientId,
    type: "medication_pre_reminder",
    title: "Obat akan datang",
    body: `${schedule.drugName} ${schedule.dosage} dijadwalkan pukul ${getJakartaTimeLabel(job.scheduledTime)} WIB.`,
    urgency: "normal",
    data: {
      schedule_id: schedule.id,
      reminder_job_id: job.id,
      scheduled_time: job.scheduledTime.toISOString(),
      scheduled_time_wib: getJakartaTimeLabel(job.scheduledTime),
      drug_name: schedule.drugName,
      dosage: schedule.dosage,
      action_url: "/medications/confirm",
    },
  });

  await db
    .update(medicationReminderJobs)
    .set({
      status: result.skipped ? "pre_skipped" : result.sent > 0 ? "pre_sent" : "pre_failed",
      attempts: (job.attempts || 0) + 1,
      notificationId: result.notificationId,
      lastError: result.sent > 0 || result.skipped ? null : "Pre-reminder gagal dikirim",
      updatedAt: new Date(),
    })
    .where(eq(medicationReminderJobs.id, job.id));
};

const sendReminderForJob = async (job: typeof medicationReminderJobs.$inferSelect, schedule: typeof medicationSchedules.$inferSelect) => {
  const result = await sendPushNotification({
    patientId: job.patientId,
    type: "medication_reminder",
    title: "Saatnya minum obat",
    body: `${schedule.drugName} ${schedule.dosage}${schedule.instructions ? ` - ${schedule.instructions}` : ""}`,
    urgency: "normal",
    data: {
      schedule_id: schedule.id,
      reminder_job_id: job.id,
      scheduled_time: job.scheduledTime.toISOString(),
      scheduled_time_wib: getJakartaTimeLabel(job.scheduledTime),
      drug_name: schedule.drugName,
      dosage: schedule.dosage,
      action_url: "/medications/confirm",
    },
  });

  await db
    .update(medicationReminderJobs)
    .set({
      status: result.skipped ? "skipped" : result.sent > 0 ? "sent" : "failed",
      attempts: (job.attempts || 0) + 1,
      notificationId: result.notificationId,
      sentAt: result.sent > 0 ? new Date() : null,
      lastError: result.sent > 0 || result.skipped ? null : "Tidak ada push yang berhasil dikirim",
      updatedAt: new Date(),
    })
    .where(eq(medicationReminderJobs.id, job.id));
};

const getScheduleForJob = async (job: typeof medicationReminderJobs.$inferSelect) => {
  const schedule = await db
    .select()
    .from(medicationSchedules)
    .where(eq(medicationSchedules.id, job.scheduleId))
    .limit(1);

  return schedule[0] || null;
};

const shouldSendReminderForSchedule = (schedule: typeof medicationSchedules.$inferSelect | null) => {
  return Boolean(schedule && schedule.isActive !== false && schedule.reminderEnabled !== false && Number(schedule.stock ?? 0) > 0);
};

const hasTerminalLog = async (job: typeof medicationReminderJobs.$inferSelect) => {
  const rows = await db
    .select({ status: medicationLogs.status })
    .from(medicationLogs)
    .where(and(
      eq(medicationLogs.scheduleId, job.scheduleId),
      eq(medicationLogs.scheduledTime, job.scheduledTime),
    ));

  return rows.some((row) => row.status === "confirmed" || row.status === "missed");
};

const hasTerminalLogForScheduleTime = async (scheduleId: string, scheduledTime: Date) => {
  const rows = await db
    .select({ status: medicationLogs.status })
    .from(medicationLogs)
    .where(and(
      eq(medicationLogs.scheduleId, scheduleId),
      eq(medicationLogs.scheduledTime, scheduledTime),
    ));

  return rows.some((row) => row.status === "confirmed" || row.status === "missed");
};

const markElapsedNonReminderDosesMissed = async (now: Date, dateKeys: readonly string[]) => {
  const nowJakarta = getJakartaDate(now);
  const schedules = await db
    .select()
    .from(medicationSchedules)
    .where(and(
      eq(medicationSchedules.isActive, true),
      eq(medicationSchedules.reminderEnabled, false),
    ));

  let processed = 0;

  for (const schedule of schedules) {
    if (Number(schedule.stock ?? 0) <= 0) continue;

    for (const dateKey of dateKeys) {
      for (const time of parseScheduledTimes(schedule.scheduledTimes)) {
        const scheduledTime = toScheduledDate(dateKey, time);
        if (nowJakarta < getMissedAt(schedule, scheduledTime)) continue;
        if (await hasTerminalLogForScheduleTime(schedule.id, scheduledTime)) continue;

        await db.insert(medicationLogs).values({
          scheduleId: schedule.id,
          patientId: schedule.patientId,
          reminderJobId: null,
          scheduledTime,
          status: "missed",
        }).onConflictDoNothing();
        processed += 1;
      }
    }
  }

  return processed;
};

const processPendingJobs = async (now: Date) => {
  const nowJakarta = getJakartaDate(now);
  const preReminderBoundary = new Date(nowJakarta.getTime() + PRE_REMINDER_MINUTES * 60_000);
  const jobs = await db
    .select()
    .from(medicationReminderJobs)
    .where(and(
      eq(medicationReminderJobs.status, "pending"),
      lte(medicationReminderJobs.scheduledTime, preReminderBoundary),
    ))
    .limit(100);

  let processed = 0;

  for (const job of jobs) {
    const schedule = await getScheduleForJob(job);
    if (!shouldSendReminderForSchedule(schedule)) continue;

    try {
      if (job.scheduledTime <= nowJakarta) {
        await sendReminderForJob(job, schedule);
      } else if (getPreReminderTime(job.scheduledTime) <= nowJakarta) {
        await sendPreReminderForJob(job, schedule);
      }
    } catch (error) {
      await markJobFailed(job.id, error);
    }

    processed += 1;
  }

  return processed;
};

const processDueReminderJobs = async (now: Date) => {
  const nowJakarta = getJakartaDate(now);
  const jobs = await db
    .select()
    .from(medicationReminderJobs)
    .where(and(
      inArray(medicationReminderJobs.status, ["pre_sent", "pre_skipped", "pre_failed"]),
      lte(medicationReminderJobs.scheduledTime, nowJakarta),
    ))
    .limit(100);

  let processed = 0;

  for (const job of jobs) {
    const schedule = await getScheduleForJob(job);
    if (!shouldSendReminderForSchedule(schedule)) continue;

    try {
      await sendReminderForJob(job, schedule);
    } catch (error) {
      await markJobFailed(job.id, error);
    }

    processed += 1;
  }

  return processed;
};

const sendUrgentEscalation = async (job: typeof medicationReminderJobs.$inferSelect, schedule: typeof medicationSchedules.$inferSelect) => {
  const result = await sendPushNotification({
    patientId: job.patientId,
    type: "escalation_urgent",
    title: "Pengingat obat penting",
    body: `Anda belum mengonfirmasi ${schedule.drugName} ${schedule.dosage}. Mohon konfirmasi jika sudah diminum.`,
    urgency: "urgent",
    data: {
      schedule_id: schedule.id,
      reminder_job_id: job.id,
      scheduled_time: job.scheduledTime.toISOString(),
      scheduled_time_wib: getJakartaTimeLabel(job.scheduledTime),
      action_url: "/medications/confirm",
    },
  });

  await sendCareTeamCriticalPushNotification(job.patientId, {
    type: "medication_urgent",
    title: "Pasien belum konfirmasi obat",
    body: `${schedule.drugName} ${schedule.dosage} belum dikonfirmasi lebih dari ${URGENT_AFTER_MINUTES} menit.`,
    urgency: "urgent",
    data: {
      patient_id: job.patientId,
      schedule_id: schedule.id,
      reminder_job_id: job.id,
      scheduled_time: job.scheduledTime.toISOString(),
      scheduled_time_wib: getJakartaTimeLabel(job.scheduledTime),
      action_url: "/dashboard",
    },
  }).catch(() => undefined);

  await db
    .update(medicationReminderJobs)
    .set({
      status: result.sent > 0 ? "urgent" : "urgent_failed",
      attempts: (job.attempts || 0) + 1,
      lastError: result.sent > 0 || result.skipped ? null : "Urgent reminder gagal dikirim",
      updatedAt: new Date(),
    })
    .where(eq(medicationReminderJobs.id, job.id));
};

const markMissedAndNotify = async (job: typeof medicationReminderJobs.$inferSelect, schedule: typeof medicationSchedules.$inferSelect) => {
  const terminalLogExists = await hasTerminalLog(job);
  let logId: string | null = null;

  if (!terminalLogExists) {
    const [log] = await db
      .insert(medicationLogs)
      .values({
        scheduleId: job.scheduleId,
        patientId: job.patientId,
        reminderJobId: job.id,
        scheduledTime: job.scheduledTime,
        status: "missed",
      })
      .onConflictDoNothing()
      .returning({ id: medicationLogs.id });

    logId = log?.id ?? null;
  }

  const result = await sendPushNotification({
    patientId: job.patientId,
    type: "escalation_critical",
    title: "Dosis obat terlewat",
    body: `${schedule.drugName} ${schedule.dosage} ditandai terlewat karena belum dikonfirmasi.`,
    urgency: "critical",
    data: {
      schedule_id: schedule.id,
      reminder_job_id: job.id,
      medication_log_id: logId,
      scheduled_time: job.scheduledTime.toISOString(),
      scheduled_time_wib: getJakartaTimeLabel(job.scheduledTime),
      nurse_dashboard_flag: true,
    },
  });

  await sendCareTeamCriticalPushNotification(job.patientId, {
    type: "medication_missed",
    title: "Dosis obat pasien terlewat",
    body: `${schedule.drugName} ${schedule.dosage} ditandai terlewat karena belum dikonfirmasi.`,
    urgency: "critical",
    data: {
      patient_id: job.patientId,
      schedule_id: schedule.id,
      reminder_job_id: job.id,
      medication_log_id: logId,
      scheduled_time: job.scheduledTime.toISOString(),
      scheduled_time_wib: getJakartaTimeLabel(job.scheduledTime),
      action_url: "/dashboard",
    },
  }).catch(() => undefined);

  await db
    .update(medicationReminderJobs)
    .set({
      status: "missed",
      attempts: (job.attempts || 0) + 1,
      lastError: result.sent > 0 || result.skipped ? null : "Critical escalation gagal dikirim",
      updatedAt: new Date(),
    })
    .where(eq(medicationReminderJobs.id, job.id));
};

const processEscalations = async (now: Date) => {
  const nowJakarta = getJakartaDate(now);
  const jobs = await db
    .select()
    .from(medicationReminderJobs)
    .where(and(
      inArray(medicationReminderJobs.status, ["sent", "skipped", "urgent", "urgent_failed"]),
      lte(medicationReminderJobs.scheduledTime, new Date(nowJakarta.getTime() - URGENT_AFTER_MINUTES * 60_000)),
    ))
    .limit(100);

  let processed = 0;

  for (const job of jobs) {
    if (await hasTerminalLog(job)) {
      await db.update(medicationReminderJobs).set({ status: "confirmed", updatedAt: new Date() }).where(eq(medicationReminderJobs.id, job.id));
      continue;
    }

    const schedule = await getScheduleForJob(job);
    if (!shouldSendReminderForSchedule(schedule)) continue;

    const ageMinutes = (nowJakarta.getTime() - job.scheduledTime.getTime()) / 60_000;
    const missedAt = getMissedAt(schedule, job.scheduledTime);

    try {
      if ((job.status === "sent" || job.status === "skipped") && ageMinutes >= URGENT_AFTER_MINUTES && nowJakarta < missedAt) {
        await sendUrgentEscalation(job, schedule);
        processed += 1;
      } else if (["sent", "skipped", "urgent", "urgent_failed"].includes(job.status) && nowJakarta >= missedAt) {
        await markMissedAndNotify(job, schedule);
        processed += 1;
      }
    } catch (error) {
      await markJobFailed(job.id, error);
    }
  }

  return processed;
};

export const processDueMedicationReminders = async (now = new Date()) => {
  if (isProcessing) return { processed: 0, skipped: true };

  isProcessing = true;

  try {
    const nowJakarta = getJakartaDate(now);
    const lookbackMinutes = getLookbackMinutes();
    const dateKeys = Array.from(new Set([
      getDateKey(now),
      getDateKey(new Date(now.getTime() - lookbackMinutes * 60_000)),
      getDateKey(new Date(now.getTime() + PRE_REMINDER_MINUTES * 60_000)),
    ]));

    let processed = await processPendingJobs(now);
    processed += await processDueReminderJobs(now);
    processed += await processEscalations(now);
    processed += await markElapsedNonReminderDosesMissed(now, dateKeys);

    const schedules = await db
      .select()
      .from(medicationSchedules)
      .where(and(
        eq(medicationSchedules.isActive, true),
        eq(medicationSchedules.reminderEnabled, true),
        lte(medicationSchedules.createdAt, now),
      ));

    for (const schedule of schedules) {
      const scheduledTimes = parseScheduledTimes(schedule.scheduledTimes);

      for (const dateKey of dateKeys) {
        for (const time of scheduledTimes) {
          const scheduledTime = toScheduledDate(dateKey, time);
          const reminderDueTime = getPreReminderTime(scheduledTime);
          if (!isDue(reminderDueTime, nowJakarta, lookbackMinutes) && !isDue(scheduledTime, nowJakarta, lookbackMinutes)) continue;
          if (schedule.createdAt && scheduledTime < getJakartaDate(schedule.createdAt)) continue;

          const job = await createReminderJob(schedule, scheduledTime);
          if (!job) continue;

          try {
            if (scheduledTime <= nowJakarta) {
              await sendReminderForJob(job, schedule);
            } else {
              await sendPreReminderForJob(job, schedule);
            }
          } catch (error) {
            await markJobFailed(job.id, error);
          }

          processed += 1;
        }
      }
    }

    if (processed > 0) {
      deleteCachedByPrefix("med-log:");
      deleteCachedByPrefix("medication-schedules:");
      invalidatePatientReadCache();
      invalidateAdherenceCache();
      invalidateDashboardCache();
    }

    return { processed, skipped: false };
  } finally {
    isProcessing = false;
  }
};

export const startMedicationReminderScheduler = (options: { keepProcessAlive?: boolean } = {}) => {
  if (process.env.ENABLE_REMINDER_SCHEDULER === "false") return null;
  if (intervalHandle) return intervalHandle;

  const tick = () => {
    processDueMedicationReminders().catch(() => {
      // Scheduler errors are stored per job; keep the process alive for the next tick.
    });
  };

  tick();
  intervalHandle = setInterval(tick, getIntervalMs());
  if (!options.keepProcessAlive) intervalHandle.unref?.();

  return intervalHandle;
};

export const stopMedicationReminderScheduler = () => {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
};

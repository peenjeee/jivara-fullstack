import { and, eq, lte } from "drizzle-orm";
import { db } from "../db";
import { medicationLogs, medicationReminderJobs, medicationSchedules } from "../db/schema";
import { sendPushNotification } from "./notification.service";

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_LOOKBACK_MINUTES = 2;
const URGENT_AFTER_MINUTES = 30;
const MISSED_AFTER_MINUTES = 60;

let intervalHandle: NodeJS.Timeout | null = null;
let isProcessing = false;

const getIntervalMs = () => Math.max(Number(process.env.REMINDER_SCHEDULER_INTERVAL_MS || DEFAULT_INTERVAL_MS), 10_000);

const getLookbackMinutes = () => Math.max(Number(process.env.REMINDER_LOOKBACK_MINUTES || DEFAULT_LOOKBACK_MINUTES), 1);

const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseScheduledTimes = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value.filter((time): time is string => typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time));
};

const toScheduledDate = (dateKey: string, time: string) => new Date(`${dateKey}T${time}:00.000Z`);

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
      drug_name: schedule.drugName,
      dosage: schedule.dosage,
      action_url: "/medications/confirm",
    },
  });

  await db
    .update(medicationReminderJobs)
    .set({
      status: result.skipped ? "skipped" : result.sent > 0 ? "sent" : "failed",
      attempts: 1,
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

const processPendingJobs = async (now: Date) => {
  const jobs = await db
    .select()
    .from(medicationReminderJobs)
    .where(and(
      eq(medicationReminderJobs.status, "pending"),
      lte(medicationReminderJobs.scheduledTime, now),
    ))
    .limit(100);

  let processed = 0;

  for (const job of jobs) {
    const schedule = await getScheduleForJob(job);
    if (!schedule || schedule.isActive === false) continue;

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
      action_url: "/medications/confirm",
    },
  });

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
      .returning({ id: medicationLogs.id });

    logId = log.id;
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
      nurse_dashboard_flag: true,
    },
  });

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
  const jobs = await db
    .select()
    .from(medicationReminderJobs)
    .where(lte(medicationReminderJobs.scheduledTime, new Date(now.getTime() - URGENT_AFTER_MINUTES * 60_000)))
    .limit(100);

  let processed = 0;

  for (const job of jobs) {
    if (!["sent", "skipped", "urgent", "urgent_failed"].includes(job.status)) continue;

    if (await hasTerminalLog(job)) {
      await db.update(medicationReminderJobs).set({ status: "confirmed", updatedAt: new Date() }).where(eq(medicationReminderJobs.id, job.id));
      continue;
    }

    const schedule = await getScheduleForJob(job);
    if (!schedule || schedule.isActive === false) continue;

    const ageMinutes = (now.getTime() - job.scheduledTime.getTime()) / 60_000;

    try {
      if ((job.status === "sent" || job.status === "skipped") && ageMinutes >= URGENT_AFTER_MINUTES && ageMinutes < MISSED_AFTER_MINUTES) {
        await sendUrgentEscalation(job, schedule);
        processed += 1;
      } else if (["sent", "skipped", "urgent", "urgent_failed"].includes(job.status) && ageMinutes >= MISSED_AFTER_MINUTES) {
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
    const lookbackMinutes = getLookbackMinutes();
    const dateKeys = Array.from(new Set([
      getDateKey(now),
      getDateKey(new Date(now.getTime() - lookbackMinutes * 60_000)),
    ]));

    let processed = await processPendingJobs(now);
    processed += await processEscalations(now);

    const schedules = await db
      .select()
      .from(medicationSchedules)
      .where(and(
        eq(medicationSchedules.isActive, true),
        lte(medicationSchedules.createdAt, now),
      ));

    for (const schedule of schedules) {
      const scheduledTimes = parseScheduledTimes(schedule.scheduledTimes);

      for (const dateKey of dateKeys) {
        for (const time of scheduledTimes) {
          const scheduledTime = toScheduledDate(dateKey, time);
          if (!isDue(scheduledTime, now, lookbackMinutes)) continue;
          if (schedule.createdAt && scheduledTime < schedule.createdAt) continue;

          const job = await createReminderJob(schedule, scheduledTime);
          if (!job) continue;

          try {
            await sendReminderForJob(job, schedule);
          } catch (error) {
            await markJobFailed(job.id, error);
          }

          processed += 1;
        }
      }
    }

    return { processed, skipped: false };
  } finally {
    isProcessing = false;
  }
};

export const startMedicationReminderScheduler = () => {
  if (process.env.ENABLE_REMINDER_SCHEDULER === "false") return null;
  if (intervalHandle) return intervalHandle;

  const tick = () => {
    processDueMedicationReminders().catch(() => {
      // Scheduler errors are stored per job; keep the process alive for the next tick.
    });
  };

  tick();
  intervalHandle = setInterval(tick, getIntervalMs());
  intervalHandle.unref?.();

  return intervalHandle;
};

export const stopMedicationReminderScheduler = () => {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
};

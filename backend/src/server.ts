import app from "./app";
import { startMedicationReminderScheduler } from "./services/medication-reminder-scheduler.service";

const PORT = process.env.PORT || 3001;
const shouldRunReminderSchedulerInWeb = process.env.REMINDER_SCHEDULER_RUN_IN_WEB === "true"
  || (process.env.NODE_ENV !== "production" && process.env.REMINDER_SCHEDULER_RUN_IN_WEB !== "false");

const server = app.listen(PORT, () => {
  if (shouldRunReminderSchedulerInWeb) startMedicationReminderScheduler();
  // console.log(`[server]: Server berjalan di http://localhost:${PORT}`);
});

server.keepAliveTimeout = Number(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS || 95_000);
server.headersTimeout = Number(process.env.SERVER_HEADERS_TIMEOUT_MS || 100_000);

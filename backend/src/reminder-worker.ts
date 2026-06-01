import { startMedicationReminderScheduler } from "./services/medication-reminder-scheduler.service";

startMedicationReminderScheduler({ keepProcessAlive: true });

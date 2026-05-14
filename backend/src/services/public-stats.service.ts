import { count, eq } from "drizzle-orm";
import { db } from "../db";
import { nurses, patients } from "../db/schema";

export const getPublicStats = async () => {
  const [nurseRows, patientRows] = await Promise.all([
    db.select({ total: count() }).from(nurses).where(eq(nurses.isActive, true)),
    db.select({ total: count() }).from(patients).where(eq(patients.isActive, true)),
  ]);

  return {
    totalNurses: nurseRows[0]?.total || 0,
    totalPatients: patientRows[0]?.total || 0,
  };
};

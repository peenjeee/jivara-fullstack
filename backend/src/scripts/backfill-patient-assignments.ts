import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { auditLogs, nurses, patientNurseAssignments, patients, users } from "../db/schema";

const shouldApply = process.argv.includes("--apply");

const run = async () => {
  const rows = await db
    .select({
      patientId: patients.id,
      patientName: users.fullName,
      nurseId: nurses.id,
      nurseUserId: auditLogs.userId,
    })
    .from(auditLogs)
    .innerJoin(patients, eq(patients.id, auditLogs.resourceId))
    .innerJoin(users, eq(users.id, patients.userId))
    .innerJoin(nurses, eq(nurses.userId, auditLogs.userId))
    .leftJoin(patientNurseAssignments, and(
      eq(patientNurseAssignments.patientId, patients.id),
      eq(patientNurseAssignments.isActive, true),
    ))
    .where(and(
      eq(auditLogs.action, "patient.created"),
      eq(auditLogs.resourceType, "patient"),
      eq(patients.organizationId, nurses.organizationId),
      isNull(patientNurseAssignments.id),
    ));

  const uniqueRows = Array.from(new Map(rows.map((row) => [row.patientId, row])).values());

  console.log(`Found ${uniqueRows.length} unassigned nurse-created patients.`);

  if (!shouldApply) {
    uniqueRows.forEach((row) => {
      console.log(`[dry-run] patient=${row.patientId} (${row.patientName}) nurse=${row.nurseId}`);
    });
    console.log("Run with --apply to insert active patient-nurse assignments.");
    return;
  }

  for (const row of uniqueRows) {
    await db.insert(patientNurseAssignments).values({
      patientId: row.patientId,
      nurseId: row.nurseId,
      assignedBy: row.nurseUserId,
    });

    console.log(`Assigned patient=${row.patientId} to nurse=${row.nurseId}`);
  }
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

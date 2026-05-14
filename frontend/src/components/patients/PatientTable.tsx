import Image from "next/image";
import Link from "next/link";
import type { PatientRecord } from "@/lib/mocks/patients";
import PatientActions, { type PatientAction } from "./PatientActions";
import PatientStatusBadge from "./PatientStatusBadge";

interface PatientTableProps {
  readonly patients: readonly PatientRecord[];
  readonly title?: string;
  readonly showViewAll?: boolean;
  readonly actions?: readonly PatientAction[];
  readonly onAction?: (action: PatientAction, patient: PatientRecord) => void;
  readonly processingAction?: string | null;
  readonly embedded?: boolean;
  readonly emptyMessage?: string;
  readonly assignedNurseByPatientId?: Readonly<Record<string, string>>;
}

export default function PatientTable({ patients, title, showViewAll = false, actions = ["view"], onAction, processingAction = null, embedded = false, emptyMessage = "Tidak ada data yang tersedia.", assignedNurseByPatientId }: PatientTableProps) {
  const isEmpty = patients.length === 0;
  const showAssignedNurse = Boolean(assignedNurseByPatientId);

  return (
    <section id="pasien" className={`overflow-hidden bg-white ${embedded ? "rounded-t-3xl" : "rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.08)]"}`}>
      {(title || showViewAll) && (
        <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-7">
          {title && <h2 className="font-display text-xl font-bold tracking-[-0.03em] text-text-main">{title}</h2>}
          {showViewAll && <Link href="/patients" className="text-sm font-extrabold text-text-main transition-colors hover:!text-primary">Lihat Semua</Link>}
        </div>
      )}

      <div className="hidden sm:block">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className={showAssignedNurse ? "w-[20%]" : "w-[25%]"} />
            <col className="w-[8%]" />
            <col className={showAssignedNurse ? "w-[20%]" : "w-[19%]"} />
            <col className={showAssignedNurse ? "w-[14%]" : "w-[16%]"} />
            <col className={showAssignedNurse ? "w-[13%]" : "w-[18%]"} />
            {showAssignedNurse && <col className="w-[18%]" />}
            <col className={showAssignedNurse ? "w-[7%]" : "w-[14%]"} />
          </colgroup>
          <thead className="bg-surface text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-3 py-4 lg:px-5">Nama Pasien</th>
              <th className="px-3 py-4 lg:px-5">Usia</th>
              <th className="px-3 py-4 lg:px-5">Status</th>
              <th className="px-3 py-4 lg:px-5">Kunjungan Terakhir</th>
              <th className="px-3 py-4 lg:px-5">Kepatuhan</th>
              {showAssignedNurse && <th className="px-3 py-4 lg:px-5">Perawat</th>}
              <th className="px-3 py-4 text-right lg:px-5">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isEmpty ? (
              <tr>
                <td colSpan={showAssignedNurse ? 7 : 6} className="px-5 py-12 text-center text-sm font-bold text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              patients.map((patient, index) => (
                <tr key={`patient-row-${patient.id}-${index}`} className="transition-colors hover:bg-surface/60">
                  <td className="px-3 py-4 lg:px-5">
                    <PatientIdentity patient={patient} />
                  </td>
                  <td className="px-3 py-4 text-sm font-bold text-muted lg:px-5">{patient.age}</td>
                  <td className="px-3 py-4 lg:px-5"><PatientStatusBadge status={patient.status} /></td>
                  <td className="px-3 py-4 text-sm font-bold text-muted lg:px-5">{patient.lastVisit}</td>
                  <td className="px-3 py-4 lg:px-5"><PatientAdherence value={patient.adherence} /></td>
                  {showAssignedNurse && <td className="px-3 py-4 text-sm font-bold text-muted lg:px-5">{assignedNurseByPatientId?.[patient.id] ?? "Belum ditugaskan"}</td>}
                  <td className="px-3 py-4 lg:px-5"><PatientActions patient={patient} actions={actions} processingAction={processingAction} onAction={onAction} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-line sm:hidden">
        {isEmpty ? (
          <p className="px-5 py-12 text-center text-sm font-bold text-muted">{emptyMessage}</p>
        ) : (
          patients.map((patient, index) => (
            <article key={`patient-card-${patient.id}-${index}`} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <PatientIdentity patient={patient} />
                <PatientActions patient={patient} actions={actions} processingAction={processingAction} onAction={onAction} />
              </div>
              <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm font-bold text-muted">
                <span>{patient.gender}</span>
                <span>{patient.lastVisit}</span>
                <PatientStatusBadge status={patient.status} />
                <PatientAdherence value={patient.adherence} />
                {showAssignedNurse && <span className="col-span-2">Perawat: {assignedNurseByPatientId?.[patient.id] ?? "Belum ditugaskan"}</span>}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function PatientIdentity({ patient }: { readonly patient: PatientRecord }) {
  return (
    <div className="flex items-center gap-4">
      {patient.image ? (
        <Image src={patient.image} alt="" width={42} height={42} sizes="42px" className="h-[42px] w-[42px] shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-emerald/10 text-sm font-extrabold text-emerald">
          {patient.avatar}
        </span>
      )}
      <div className="min-w-0">
        <p className="break-words font-extrabold leading-tight text-text-main">{patient.name}</p>
        <p className="mt-0.5 text-sm font-semibold text-muted">{patient.gender}</p>
      </div>
    </div>
  );
}

function PatientAdherence({ value }: { readonly value: number }) {
  const tone = value < 50 ? "bg-danger" : value < 75 ? "bg-warning" : "bg-primary";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-line">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-bold text-muted">{value}%</span>
    </div>
  );
}

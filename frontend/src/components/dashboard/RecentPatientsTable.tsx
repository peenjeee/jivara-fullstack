import Link from "next/link";
import Image from "next/image";
import { Eye } from "lucide-react";
import type { RecentPatient } from "@/lib/mocks/dashboard";
import { patientStatusStyle } from "./styles";

interface RecentPatientsTableProps {
  readonly patients: RecentPatient[];
}

export default function RecentPatientsTable({ patients }: RecentPatientsTableProps) {
  return (
    <section id="pasien" className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-7">
        <h2 className="font-display text-xl font-bold tracking-[-0.03em] text-text-main">Pasien Terbaru</h2>
        <Link href="#pasien" className="text-sm font-extrabold text-text-main transition-colors hover:!text-primary">
          Lihat Semua
        </Link>
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-surface text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-7 py-4">Nama Pasien</th>
              <th className="px-7 py-4">ID  </th>
              <th className="px-7 py-4">Status</th>
              <th className="px-7 py-4">Kunjungan Terakhir</th>
              <th className="px-7 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {patients.map((patient) => (
              <tr key={patient.mrn} className="transition-colors hover:bg-surface/60">
                <td className="px-7 py-4">
                  <PatientIdentity patient={patient} />
                </td>
                <td className="px-7 py-4 text-sm font-bold text-muted">{patient.mrn}</td>
                <td className="px-7 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${patientStatusStyle(patient.status)}`}>{patient.status}</span>
                </td>
                <td className="px-7 py-4 text-sm font-bold text-muted">{patient.lastVisit}</td>
                <td className="px-7 py-4 text-right">
                  <button className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary/10 hover:text-primary" aria-label={`Lihat detail ${patient.name}`}>
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-line sm:hidden">
        {patients.map((patient) => (
          <article key={patient.mrn} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <PatientIdentity patient={patient} />
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary/10 hover:text-primary" aria-label={`Lihat detail ${patient.name}`}>
                <Eye size={18} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm font-bold text-muted">
              <span>{patient.mrn}</span>
              <span>{patient.lastVisit}</span>
              <span className={`col-span-2 w-fit rounded-full px-3 py-1 text-xs font-extrabold ${patientStatusStyle(patient.status)}`}>{patient.status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PatientIdentity({ patient }: { readonly patient: RecentPatient }) {
  return (
    <div className="flex items-center gap-4">
      {patient.image ? (
        <Image src={patient.image} alt="" width={42} height={42} className="h-[42px] w-[42px] rounded-full object-cover" />
      ) : (
        <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-500">
          {patient.avatar}
        </span>
      )}
      <div>
        <p className="font-extrabold text-text-main">{patient.name}</p>
        <p className="mt-0.5 text-sm font-semibold text-muted">{patient.meta}</p>
      </div>
    </div>
  );
}

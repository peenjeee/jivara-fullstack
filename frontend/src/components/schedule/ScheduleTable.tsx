"use client";

import { motion } from "motion/react";
import { Eye, Plus } from "lucide-react";
import type { PatientScheduleGroup } from "@/lib/mocks/schedules";
import ScheduleStatusBadge from "./ScheduleStatusBadge";

interface ScheduleTableProps {
  readonly groups: readonly PatientScheduleGroup[];
  readonly onViewDetail: (group: PatientScheduleGroup) => void;
  readonly onAddMedicine: (group: PatientScheduleGroup) => void;
  readonly emptyMessage?: string;
}

export default function ScheduleTable({ groups, onViewDetail, onAddMedicine, emptyMessage = "Tidak ada data yang tersedia." }: ScheduleTableProps) {
  const isEmpty = groups.length === 0;

  return (
    <section className="overflow-hidden rounded-t-3xl bg-white">
      <div className="hidden lg:block">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[16%]" />
            <col className="w-[20%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="bg-surface text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-4">Nama Pasien</th>
              <th className="px-4 py-4">Jumlah Obat</th>
              <th className="px-4 py-4">Total Obat Keseluruhan</th>
              <th className="px-4 py-4">Reminder Aktif</th>
              <th className="px-4 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isEmpty ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm font-bold text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              groups.map((group, index) => (
                <motion.tr
                  key={group.patientId}
                  className="transition-colors hover:bg-surface/60"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.035 }}
                >
                  <td className="px-4 py-4"><PatientCell group={group} /></td>
                  <td className="px-4 py-4 text-sm font-extrabold text-text-main">{group.schedules.length} obat</td>
                  <td className="px-4 py-4 text-sm font-extrabold text-text-main">{group.totalMedicineStock} item</td>
                  <td className="px-4 py-4 text-sm font-extrabold text-text-main">{group.activeReminders}</td>
                  <td className="px-4 py-4"><GroupActions group={group} onViewDetail={onViewDetail} onAddMedicine={onAddMedicine} /></td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-line lg:hidden">
        {isEmpty ? (
          <p className="px-5 py-12 text-center text-sm font-bold text-muted">{emptyMessage}</p>
        ) : (
          groups.map((group, index) => (
            <motion.article
              key={group.patientId}
              className="p-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ backgroundColor: "rgba(248,250,252,0.7)" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
            >
              <div className="flex items-start justify-between gap-4">
                <PatientCell group={group} />
                <ScheduleStatusBadge status={group.summaryStatus} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <InfoItem label="Jumlah Obat" value={`${group.schedules.length} obat`} />
                <InfoItem label="Total Obat" value={`${group.totalMedicineStock} item`} />
                <InfoItem label="Reminder" value={`${group.activeReminders} aktif`} />
              </div>
              <div className="mt-4">
                <GroupActions group={group} onViewDetail={onViewDetail} onAddMedicine={onAddMedicine} />
              </div>
            </motion.article>
          ))
        )}
      </div>
    </section>
  );
}

function PatientCell({ group }: { readonly group: PatientScheduleGroup }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald/10 text-sm font-extrabold text-emerald">
        {group.patientAvatar}
      </span>
      <div className="min-w-0">
        <p className="break-words font-extrabold leading-tight text-text-main">{group.patientName}</p>
      </div>
    </div>
  );
}

function GroupActions({ group, onViewDetail, onAddMedicine }: {
  readonly group: PatientScheduleGroup;
  readonly onViewDetail: (group: PatientScheduleGroup) => void;
  readonly onAddMedicine: (group: PatientScheduleGroup) => void;
}) {
  return (
    <div className="flex justify-end gap-1.5">
      <button type="button" onClick={() => onViewDetail(group)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary/10 hover:text-primary" aria-label={`Lihat detail ${group.patientName}`}>
        <Eye size={16} />
      </button>
      <button type="button" onClick={() => onAddMedicine(group)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary/10 hover:text-primary" aria-label={`Tambah obat ${group.patientName}`}>
        <Plus size={16} />
      </button>
    </div>
  );
}

function InfoItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-bold text-text-main">{value}</p>
    </div>
  );
}

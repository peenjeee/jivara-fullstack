"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, BellRing, CheckCircle2 } from "lucide-react";
import { listNotifications, markNotificationAsRead, type NotificationRecord } from "@/helpers/notifications";
import Button from "@/components/ui/Button";

const pollingIntervalMs = 60_000;

interface DashboardNotificationAlertsProps {
  readonly patientId?: string | null;
}

export default function DashboardNotificationAlerts({ patientId }: DashboardNotificationAlertsProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const records = await listNotifications({ patientId: patientId || undefined, limit: 5 });
        if (!isMounted) return;
        startTransition(() => setNotifications(records.filter((record) => record.status !== "read")));
      } catch {
        if (!isMounted) return;
        startTransition(() => setNotifications([]));
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(loadNotifications, pollingIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [patientId]);

  const handleRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <section className="mt-6 rounded-[28px] border border-border bg-card p-5 shadow-soft" aria-label="Alert notifikasi pasien">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Alert Pasien</p>
          <h2 className="mt-1 text-xl font-bold text-text-main">Notifikasi terbaru</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{isPending ? "Memuat..." : `${notifications.length} aktif`}</span>
      </div>

      <div className="mt-4 grid gap-3">
        {notifications.map((notification) => (
          <article key={notification.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${getToneClass(notification)}`}>
                {getIcon(notification)}
              </span>
              <div>
                <h3 className="font-semibold text-text-main">{notification.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{notification.body}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{notification.type.replace(/_/g, " ")}</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleRead(notification.id)}>Tandai Dibaca</Button>
          </article>
        ))}
      </div>
    </section>
  );
}

function getToneClass(notification: NotificationRecord) {
  if (notification.urgency === "critical") return "bg-danger/10 text-danger";
  if (notification.urgency === "urgent" || notification.urgency === "high") return "bg-warning/10 text-warning";
  return "bg-primary/10 text-primary";
}

function getIcon(notification: NotificationRecord) {
  if (notification.urgency === "critical" || notification.urgency === "urgent") return <AlertTriangle size={20} />;
  if (notification.status === "delivered") return <CheckCircle2 size={20} />;
  return <BellRing size={20} />;
}

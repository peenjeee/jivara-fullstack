"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import axios from "axios";
import AuthCard from "@/components/ui/AuthCard";
import Button from "@/components/ui/Button";
import { showError, showToast } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";

const statusContent = {
  active: {
    icon: CheckCircle2,
    title: "Akun Aktif",
    description: "Akun Anda sudah aktif dan dapat mengakses dashboard.",
    tone: "text-primary",
  },
  pending: {
    icon: Clock3,
    title: "Menunggu Persetujuan",
    description: "Akun Anda sudah terdaftar dan sedang menunggu persetujuan.",
    tone: "text-warning",
  },
  rejected: {
    icon: AlertTriangle,
    title: "Pendaftaran Ditolak",
    description: "Pengajuan Anda belum dapat disetujui.",
    tone: "text-danger",
  },
  suspended: {
    icon: AlertTriangle,
    title: "Akun Diblokir",
    description: "Akun Anda sedang diblokir dan tidak dapat mengakses dashboard.",
    tone: "text-muted",
  },
} as const;

type ReviewStatus = keyof typeof statusContent;

function getReviewStatus(status?: string | null): ReviewStatus | null {
  if (status === "pending" || status === "rejected" || status === "suspended" || status === "active") return status;
  return "pending";
}

export default function AccountStatusPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const updateUser = useAuthStore((state) => state.updateUser);
  const hasAutoRefreshedRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [statusCheckSucceeded, setStatusCheckSucceeded] = useState(false);
  const reviewStatus = getReviewStatus(user?.accountStatus);
  const content = reviewStatus ? statusContent[reviewStatus] : statusContent.pending;
  const Icon = content.icon;

  const refreshStatus = useCallback(async (showFeedback = true) => {
    setRefreshing(true);
    try {
      const statusResponse = await axios.post("/api/auth/status");
      const updatedUser = statusResponse.data.data.user;
      updateUser(updatedUser);
      setStatusCheckSucceeded(true);

      if (updatedUser.role === "admin" && (updatedUser.accountStatus ?? "active") === "active") {
        if (showFeedback) showToast("Akun Anda sudah aktif.", "success");
        router.replace("/dashboard");
        return;
      }

      if (updatedUser.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      if (showFeedback) showToast("Status akun berhasil diperbarui.");
    } catch {
      setStatusCheckSucceeded(false);
      if (showFeedback) showError("Gagal memperbarui status akun.");
    } finally {
      setRefreshing(false);
      setHasCheckedStatus(true);
    }
  }, [router, updateUser]);

  useEffect(() => {
    if (!hasAuthHydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/dashboard");
    }

    if (hasCheckedStatus && statusCheckSucceeded && (user.accountStatus ?? "active") === "active") {
      router.replace("/dashboard");
    }
  }, [hasAuthHydrated, hasCheckedStatus, router, statusCheckSucceeded, user]);

  useEffect(() => {
    if (!hasAuthHydrated || !user || user.role !== "admin" || hasAutoRefreshedRef.current) return;
    hasAutoRefreshedRef.current = true;
    void Promise.resolve().then(() => refreshStatus(false));
  }, [hasAuthHydrated, refreshStatus, user]);

  if (!hasAuthHydrated || !user || user.role !== "admin" || (statusCheckSucceeded && (user.accountStatus ?? "active") === "active")) return null;

  if (!hasCheckedStatus) {
    return (
      <AuthCard title="Status Akun">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 animate-pulse rounded-3xl bg-line/70" />
          <div className="mx-auto h-7 w-44 animate-pulse rounded-xl bg-line/70" />
          <div className="mx-auto h-4 w-64 max-w-full animate-pulse rounded-xl bg-line/60" />
          <div className="h-11 w-full animate-pulse rounded-full bg-line/60" />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Status Akun"
    >
      <motion.div className="text-center" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-3xl ${content.tone}`}>
          <Icon size={50} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">{content.title}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-muted">{content.description}</p>
        {reviewStatus === "rejected" && user?.rejectedReason && (
          <div className="mt-5 rounded-2xl bg-danger/10 px-4 py-3 text-left text-sm font-bold leading-6 text-danger">
            Alasan: {user?.rejectedReason}
          </div>
        )}
        <Button type="button" className="mt-7 w-full" loading={refreshing} onClick={() => refreshStatus()}>
          Perbarui Status
        </Button>
      </motion.div>
    </AuthCard>
  );
}

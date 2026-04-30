'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useAuthStore } from '@/store/auth';
import Cookies from 'js-cookie';
import { showToast, showConfirm } from '@/lib/swal';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import {
  NurseDashboardNavbar,
  RecentPatientsTable,
} from '@/components/dashboard';
import SummaryCard from '@/components/ui/SummaryCard';
import { dashboardStats, recentPatients } from '@/lib/mocks/dashboard';

export default function DashboardPage() {
  const { user, logout, setAuth, token, refreshToken } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        // Update state auth dengan data profil yang paling baru
        if (token && refreshToken) {
          setAuth(data.data, token, refreshToken);
        }
      } catch {
        // Gagal memuat profil, gunakan data dari store
      } finally {
        setLoading(false);
      }
    };

    // Hanya fetch jika kita memiliki token di store
    if (token) {
      fetchUser();
    } else {
      // Tunda untuk menghindari peringatan setState sinkron dalam effect
      Promise.resolve().then(() => setLoading(false));
    }
  }, [setAuth, token, refreshToken]);

  const handleLogout = async () => {
    const result = await showConfirm('Keluar Akun?', 'Anda perlu masuk kembali untuk mengakses data Anda.', 'Ya, Keluar');

    if (result.isConfirmed) {
      try {
        // Panggil endpoint logout agar sesi di backend ikut dihapus
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch {
        // Logout backend gagal, lanjutkan logout lokal
      }

      // Proses logout secara lokal
      logout();
      Cookies.remove('jivara-token');
      showToast('Berhasil keluar dari akun.', 'success');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-5">
        <p className="text-gray-500 font-medium">Memuat data pengguna...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface">
      <NurseDashboardNavbar onLogout={handleLogout} />

      <motion.main
        className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:ml-[280px] lg:w-[calc(100%-280px)] lg:max-w-none lg:px-10 lg:py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.section
          id="overview"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em] text-text-main sm:text-4xl">
            Ringkasan Pasien
          </h1>
        </motion.section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {dashboardStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 + index * 0.08 }}
            >
              <SummaryCard stat={stat} />
            </motion.div>
          ))}
        </section>

        <motion.div
          className="mt-6 flex justify-end"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.32 }}
        >
          <Button size="sm" icon={<Plus size={16} />}>
            Pasien Baru
          </Button>
        </motion.div>

        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        >
          <RecentPatientsTable patients={recentPatients} />
        </motion.div>
      </motion.main>
    </div>
  );
}

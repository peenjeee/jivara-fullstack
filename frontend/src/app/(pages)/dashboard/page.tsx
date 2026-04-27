'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Cookies from 'js-cookie';
import { showToast, showConfirm } from '@/lib/swal';
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { LogOut } from 'lucide-react';
import api from '@/lib/axios';

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
    <div className="min-h-screen bg-surface flex items-center justify-center p-5">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-2xl font-bold text-dark mb-5">
          Halo, {(user.fullName || 'Pengguna').split(' ')[0]}!
        </h1>
        <div className="my-5 text-gray-600 space-y-2">
          <p>Selamat datang di Dashboard Jivara.</p>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          icon={<LogOut size={18} />}
          className="w-full"
        >
          Keluar
        </Button>
      </Card>
    </div>
  );
}
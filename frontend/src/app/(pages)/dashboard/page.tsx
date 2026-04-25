'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Cookies from 'js-cookie';
import { showToast, showConfirm } from '@/utils/swal';
import Button from "@/app/components/ui/Button";
import { LogOut } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    const result = await showConfirm('Keluar Akun?', 'Anda perlu masuk kembali untuk mengakses data Anda.', 'Ya, Keluar');
    
    if (result.isConfirmed) {
      logout();
      Cookies.remove('jivara-token');
      showToast('Berhasil keluar dari akun.', 'success');
      router.push('/login');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-md">
        <h1 className="font-display text-2xl font-bold text-dark mb-5">
          Halo, {(user.fullName || (user as any).full_name || 'Pengguna').split(' ')[0]}!
        </h1>
        <div className="my-5"></div>
        <Button 
          onClick={handleLogout}
          variant="outline"
          icon={<LogOut size={18} />}
          className="w-full"
        >
          Keluar
        </Button>
      </div>
    </div>
  );
}
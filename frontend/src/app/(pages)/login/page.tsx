'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import api from '@/lib/axios';
import Cookies from 'js-cookie';
import { showError, showWarning, showLoading, showToast, closeAlert } from '@/lib/swal';
import { useAuthStore } from '@/store/auth';
import AuthCard from '@/components/ui/AuthCard';
import AuthInput from '@/components/ui/AuthInput';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!identifier || !password) {
      setLoading(false);
      showWarning('Harap isi semua kolom yang tersedia.');
      return;
    }

    showLoading('Mohon Tunggu', 'Sedang masuk ke akun Anda...');

    try {
      // Backend menangani identifier sebagai email atau telepon
      const response = await api.post('/auth/login', {
        identifier,
        password,
      });

      const { user, access_token, refresh_token } = response.data.data;

      if (!access_token || !user) {
        throw new Error('Data autentikasi tidak valid dari server.');
      }

      // Simpan di Zustand
      setAuth(user, access_token, refresh_token);

      // Simpan di Cookie untuk Middleware (kedaluwarsa 7 hari sesuai refresh token)
      Cookies.set('jivara-token', access_token, {
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      showToast('Anda berhasil masuk.', 'success');
      router.push('/dashboard');
    } catch {
      closeAlert();
      showError('Login gagal. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 px-5 flex items-center justify-center bg-surface">
        <AuthCard
          title="MASUK"
          subtitle="Akses dashboard kesehatan Pasien Anda sekarang."
          footer={
            <p className="text-muted font-body">
              Belum punya akun?{' '}
              <Link href="/register" className="font-bold underline hover-text-primary transition-colors hover:text-primary-dark">
                Daftar
              </Link>
            </p>    
          }
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <AuthInput
              id="identifier"
              label="Email atau Nomor Telepon"
              type="text"
              placeholder="nama@email.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />

            <AuthInput
              id="password"
              label="Kata Sandi"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full"
              icon={<LogIn size={18} />}
              loading={loading}
            >
              Masuk
            </Button>
          </form>
        </AuthCard>
      </main>
      <Footer />
    </>
  );
}

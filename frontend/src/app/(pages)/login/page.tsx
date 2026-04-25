'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import Navbar from "@/app/components/landing/Navbar";
import Footer from "@/app/components/landing/Footer";
import axios from 'axios';
import Cookies from 'js-cookie';
import { showError, showWarning, showLoading, showToast, closeAlert } from '@/utils/swal';
import { useAuthStore } from '@/store/auth';
import Button from "@/app/components/ui/Button";

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
      // Backend handles identifier as either email or phone
      const response = await axios.post('http://localhost:3001/api/auth/login', {
        identifier,
        password,
      });

      const { user, access_token, refresh_token } = response.data.data;

      // Store in Zustand
      setAuth(user, access_token, refresh_token);

      // Store in Cookie for Middleware (expires in 7 days to match refresh token)
      Cookies.set('jivara-token', access_token, { expires: 7 });

      showToast('Anda berhasil masuk.', 'success');
      router.push('/dashboard');
    } catch (error: any) {
      closeAlert();
      showError(error.response?.data?.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 px-5 flex items-center justify-center bg-surface">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 lg:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] shadow-sm animate-fade-lift">
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl font-extrabold text-dark mb-2">MASUK</h1>
            <p className="text-muted font-body">Akses dashboard kesehatan Pasien Anda sekarang.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2" htmlFor="identifier">
                Email atau Nomor Telepon <span className="text-red-500">*</span>
              </label>
              <input
                id="identifier"
                type="text"
                className="w-full px-5 py-4 bg-surface shadow-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body"
                placeholder="nama@email.com / +62..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2" htmlFor="password">
                Kata Sandi <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-5 py-4 bg-surface shadow-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              icon={<LogIn size={18} />}
              disabled={loading}
            >
              {loading ? 'Tunggu...' : 'Masuk'}
            </Button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-muted font-body">
              Belum punya akun?{' '}
              <Link href="/register" className="text-primary font-bold hover:underline">
                Daftar
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

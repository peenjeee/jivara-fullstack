'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import Navbar from "@/app/components/landing/Navbar";
import Footer from "@/app/components/landing/Footer";
import axios from 'axios';
import { showError, showWarning, showLoading, showToast, closeAlert } from '@/utils/swal';
import Button from "@/app/components/ui/Button";

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!fullName || !email || !password || !phone) {
      setLoading(false);
      showWarning('Harap isi semua kolom yang tersedia.');
      return;
    }

    if (!emailRegex.test(email)) {
      setLoading(false);
      showWarning('Silakan masukkan alamat email yang valid.', 'Format Email Salah!');
      return;
    }

    showLoading('Mohon Tunggu', 'Sedang mendaftarkan akun Anda...');

    try {
      await axios.post('http://localhost:3001/api/auth/register', {
        fullName,
        email,
        phone,
        password,
        role: 'patient',
      });

      showToast('Akun Anda telah terdaftar. Silakan masuk.', 'success');
      router.push('/login');
    } catch (error: any) {
      closeAlert();
      showError(error.response?.data?.message || 'Terjadi kesalahan saat mendaftar.');
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
            <h1 className="font-display text-3xl font-extrabold text-dark mb-2">DAFTAR</h1>
            <p className="text-muted font-body">Mulai monitoring kesehatan Pasien Anda bersama Jivara.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2" htmlFor="fullName">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                className="w-full px-5 py-4 bg-surface shadow-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body"
                placeholder="Nama Lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2" htmlFor="email">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="text"
                className="w-full px-5 py-4 bg-surface shadow-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2" htmlFor="phone">
                Nomor Telepon <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="text"
                className="w-full px-5 py-4 bg-surface shadow-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body"
                placeholder="+628..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
              icon={<UserPlus size={18} />}
              disabled={loading}
            >
              {loading ? 'Tunggu...' : 'Daftar'}
            </Button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-muted font-body">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

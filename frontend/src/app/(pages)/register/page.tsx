'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import api from '@/lib/axios';
import { showError, showWarning, showLoading, showToast, closeAlert } from '@/lib/swal';
import AuthCard from '@/components/ui/AuthCard';
import AuthInput from '@/components/ui/AuthInput';
import Button from '@/components/ui/Button';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!fullName || !email || !password || !phone || !confirmPassword) {
      setLoading(false);
      showWarning('Harap isi semua kolom yang tersedia.');
      return;
    }

    if (!emailRegex.test(email)) {
      setLoading(false);
      showWarning('Silakan masukkan alamat email yang valid.', 'Format Email Salah!');
      return;
    }

    if (password !== confirmPassword) {
      setLoading(false);
      showWarning('Kata sandi dan konfirmasi kata sandi tidak cocok.', 'Password Tidak Cocok!');
      return;
    }

    showLoading('Mohon Tunggu', 'Sedang mendaftarkan akun Anda...');

    try {
      await api.post('/auth/register', {
        fullName,
        email,
        phone,
        password,
        role: 'nurse', // Peran default untuk registrasi
      });

      showToast('Akun Anda telah terdaftar. Silakan masuk.', 'success');
      router.push('/login');
    } catch {
      closeAlert();
      showError('Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 px-5 flex items-center justify-center bg-surface">
        <AuthCard
          title="DAFTAR"
          subtitle="Mulai monitoring kesehatan Pasien Anda bersama Jivara."
          footer={
            <p className="text-muted font-body">
              Sudah punya akun?{' '}
              <Link href="/login" className="font-bold underline hover-text-primary transition-colors hover:text-primary-dark">
                Masuk
              </Link>
            </p>
          }
        >
          <form onSubmit={handleRegister} className="space-y-6">
            <AuthInput
              id="fullName"
              label="Nama Lengkap"
              type="text"
              placeholder="Nama Lengkap"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />

            <AuthInput
              id="email"
              label="Email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <AuthInput
              id="phone"
              label="Nomor Telepon"
              type="text"
              placeholder="+628..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />

            <AuthInput
              id="password"
              label="Kata Sandi"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />

            <AuthInput
              id="confirmPassword"
              label="Konfirmasi Kata Sandi"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              className="w-full"
              icon={<UserPlus size={18} />}
              loading={loading}
            >
              Daftar
            </Button>
          </form>
        </AuthCard>
      </main>
      <Footer />
    </>
  );
}

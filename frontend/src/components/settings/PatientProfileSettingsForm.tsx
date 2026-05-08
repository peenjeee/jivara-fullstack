"use client";

import { useState, type FormEvent } from "react";
import { Home, Mail, Phone, Save, User } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";
import { patients } from "@/lib/mocks/patients";
import { showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";

const mockPatient = patients[0];
const numericPhone = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

export default function PatientProfileSettingsForm() {
  const { user, token, refreshToken, setAuth } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName ?? mockPatient.name);
  const [phone, setPhone] = useState(numericPhone(user?.phone ?? mockPatient.phone));
  const [address, setAddress] = useState(user?.address ?? mockPatient.address ?? "");
  const email = user?.email ?? mockPatient.email ?? "Belum tersedia";
  const age = user?.age || mockPatient.age;
  const gender = user?.gender ?? mockPatient.gender;

  const updatePhone = (value: string) => {
    setPhone(value.replace(/\D/g, ""));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName || !trimmedPhone || !trimmedAddress) {
      showWarning("Nama, nomor telepon, dan alamat wajib diisi.");
      return;
    }

    if (user && token && refreshToken) {
      setAuth({ ...user, fullName: trimmedName, phone: trimmedPhone, address: trimmedAddress }, token, refreshToken);
    }

    showToast("Profil pasien berhasil diperbarui.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <AuthInput id="patientSettingsName" label="Nama Lengkap" value={fullName} onChange={(event) => setFullName(event.target.value)} icon={<User size={20} />} autoComplete="name" />

      <div className="grid gap-5 sm:grid-cols-2">
        <AuthInput id="patientSettingsPhone" label="Nomor Telepon" type="tel" inputMode="numeric" pattern="[0-9]*" placeholder="628..." value={phone} onChange={(event) => updatePhone(event.target.value)} icon={<Phone size={20} />} autoComplete="tel" />
        <AuthInput id="patientSettingsEmail" label="Email" type="email" value={email} onChange={() => undefined} icon={<Mail size={20} />} autoComplete="email" disabled />
      </div>

      <AuthInput id="patientSettingsAddress" label="Alamat" value={address} onChange={(event) => setAddress(event.target.value)} icon={<Home size={20} />} autoComplete="street-address" />

      <div className="grid gap-5 sm:grid-cols-2">
        <AuthInput id="patientSettingsAge" label="Umur" value={`${age} tahun`} onChange={() => undefined} icon={<User size={20} />} disabled />
        <AuthInput id="patientSettingsGender" label="Gender" value={gender} onChange={() => undefined} icon={<User size={20} />} disabled />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" icon={<Save size={18} />}>Simpan</Button>
      </div>
    </form>
  );
}

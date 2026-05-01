"use client";

import { useState, type FormEvent } from "react";
import { Home, Lock, Mail, Phone, User, UserPlus } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";
import { showWarning } from "@/lib/swal";
import type { PatientRecord } from "@/lib/mocks/patients";

export interface AddPatientValues {
  readonly fullName: string;
  readonly age: number;
  readonly gender: "Pria" | "Wanita";
  readonly phone: string;
  readonly email: string;
  readonly password: string;
  readonly address: string;
}

interface AddPatientFormProps {
  readonly initialValues?: Partial<AddPatientValues>;
  readonly mode?: "add" | "edit";
  readonly onSubmit: (values: AddPatientValues) => void;
  readonly onCancel: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createPatientRecord(values: AddPatientValues, order: number): PatientRecord {
  const initials = values.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join("");

  return {
    id: `JVR-${String(order).padStart(2, "0")}`,
    name: values.fullName,
    age: values.age,
    gender: values.gender,
    phone: values.phone,
    email: values.email,
    address: values.address,
    status: "On Ideal Schedule",
    lastVisit: new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    adherence: 100,
    avatar: initials || "P",
  };
}

export default function AddPatientForm({ initialValues, mode = "add", onSubmit }: AddPatientFormProps) {
  const [fullName, setFullName] = useState(initialValues?.fullName ?? "");
  const [age, setAge] = useState(initialValues?.age ? String(initialValues.age) : "");
  const [gender, setGender] = useState<"Pria" | "Wanita">(initialValues?.gender ?? "Pria");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [password, setPassword] = useState(initialValues?.password ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmedFullName = fullName.trim();
    const trimmedAge = age.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedAddress = address.trim();
    const numericAge = Number(trimmedAge);

    if (!trimmedFullName || !trimmedAge || !gender || !trimmedPhone || !trimmedEmail || !trimmedAddress) {
      showWarning("Harap isi semua kolom pasien.");
      return;
    }

    if (!trimmedPassword) {
      showWarning("Password pasien wajib diisi.");
      return;
    }

    if (!Number.isInteger(numericAge) || numericAge <= 0) {
      showWarning("Umur pasien harus berupa angka lebih dari 0.", "Umur Tidak Valid");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      showWarning("Silakan masukkan alamat email pasien yang valid.", "Format Email Salah");
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 6) {
      showWarning("Password pasien minimal 6 karakter.", "Password Terlalu Pendek");
      return;
    }

    onSubmit({
      fullName: trimmedFullName,
      age: numericAge,
      gender,
      phone: trimmedPhone,
      email: trimmedEmail,
      password: trimmedPassword,
      address: trimmedAddress,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <AuthInput
          id="patientName"
          label="Nama Lengkap"
          type="text"
          placeholder="Nama pasien"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          icon={<User size={20} />}
        />
        <AuthInput
          id="patientAge"
          label="Umur"
          type="number"
          placeholder="42"
          value={age}
          onChange={(event) => setAge(event.target.value)}
          icon={<User size={20} />}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-2 block text-sm font-semibold text-dark">
            Kelamin <span className="text-red-500">*</span>
          </legend>
          <div className="flex flex-wrap gap-7 py-3">
            {(["Pria", "Wanita"] as const).map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2.5 text-sm font-extrabold text-muted transition-colors hover:text-text-main"
              >
                <input
                  type="radio"
                  name="patientGender"
                  value={option}
                  checked={gender === option}
                  onChange={() => setGender(option)}
                  className="h-5 w-5 appearance-none rounded-full border-2 border-muted bg-white bg-clip-content p-[3px] transition-all checked:border-primary checked:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className={gender === option ? "text-text-main" : "text-muted"}>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <AuthInput
          id="patientPhone"
          label="Nomor Telepon"
          type="text"
          placeholder="+628..."
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          icon={<Phone size={20} />}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <AuthInput
          id="patientEmail"
          label="Email"
          type="email"
          placeholder="pasien@email.com"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          icon={<Mail size={20} />}
        />
        <AuthInput
          id="patientPassword"
          label="Password"
          type="password"
          placeholder="********"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          icon={<Lock size={20} />}
        />
      </div>

      <AuthInput
        id="patientAddress"
        label="Alamat"
        type="text"
        placeholder="Alamat pasien"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        icon={<Home size={20} />}
      />

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="submit" icon={<UserPlus size={18} />}>
          {mode === "add" ? "Simpan Pasien" : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}

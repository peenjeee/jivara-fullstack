"use client";

import { useReducer } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Lock, Mail, Phone, User, UserPlus } from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiErrors";
import api from "@/lib/axios";
import { closeAlert, showError, showLoading, showToast, showWarning } from "@/lib/swal";
import AuthCard from "@/components/ui/AuthCard";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterFormState {
  readonly fullName: string;
  readonly organizationName: string;
  readonly email: string;
  readonly phone: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly loading: boolean;
}

type RegisterFormAction =
  | { readonly type: "setField"; readonly field: keyof Omit<RegisterFormState, "loading">; readonly value: string }
  | { readonly type: "setLoading"; readonly value: boolean };

const initialRegisterFormState: RegisterFormState = {
  fullName: "",
  organizationName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  loading: false,
};

function registerFormReducer(state: RegisterFormState, action: RegisterFormAction): RegisterFormState {
  switch (action.type) {
    case "setField":
      return { ...state, [action.field]: action.value };
    case "setLoading":
      return { ...state, loading: action.value };
    default:
      return state;
  }
}

export default function RegisterForm() {
  const [state, dispatch] = useReducer(registerFormReducer, initialRegisterFormState);
  const { fullName, organizationName, email, phone, password, confirmPassword, loading } = state;
  const { push } = useRouter();

  const updatePhone = (value: string) => {
    dispatch({ type: "setField", field: "phone", value: value.replace(/\D/g, "") });
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    dispatch({ type: "setLoading", value: true });

    if (!fullName || !organizationName || !email || !password || !phone || !confirmPassword) {
      dispatch({ type: "setLoading", value: false });
      showWarning("Harap isi semua kolom yang tersedia.");
      return;
    }

    if (!emailRegex.test(email)) {
      dispatch({ type: "setLoading", value: false });
      showWarning("Silakan masukkan alamat email yang valid.", "Format Email Salah!");
      return;
    }

    if (password !== confirmPassword) {
      dispatch({ type: "setLoading", value: false });
      showWarning("Kata sandi dan konfirmasi kata sandi tidak cocok.", "Password Tidak Cocok!");
      return;
    }

    showLoading("Mohon Tunggu", "Sedang mendaftarkan akun Anda...");

    try {
      await api.post("/auth/register", {
        fullName,
        organizationName,
        email,
        phone,
        password,
      });

      showToast("Pendaftaran berhasil!", "success");
      push("/login");
    } catch (error) {
      closeAlert();
      showError(getApiErrorMessage(error, "Terjadi kesalahan saat mendaftar. Silakan coba lagi."));
    } finally {
      dispatch({ type: "setLoading", value: false });
    }
  };

  return (
    <AuthCard
      title="Daftar"
      footer={
        <p className="text-muted font-body">
          Sudah punya akun?{" "}
          <Link href="/login" prefetch className="font-bold !text-primary underline transition-colors hover:!text-primary-dark">
            Masuk
          </Link>
        </p>
      }
    >
      <form onSubmit={handleRegister} className="space-y-6" noValidate>
        <AuthInput
          id="fullName"
          label="Nama Lengkap"
          type="text"
          placeholder="Nama Lengkap"
          value={fullName}
          onChange={(event) => dispatch({ type: "setField", field: "fullName", value: event.target.value })}
          autoComplete="name"
          icon={<User size={20} />}
        />

        <AuthInput
          id="organizationName"
          label="Nama Organisasi"
          type="text"
          placeholder="Masukkan Nama Organisasi"
          value={organizationName}
          onChange={(event) => dispatch({ type: "setField", field: "organizationName", value: event.target.value })}
          autoComplete="organization"
          icon={<Building2 size={20} />}
        />

        <AuthInput
          id="email"
          label="Email"
          type="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(event) => dispatch({ type: "setField", field: "email", value: event.target.value })}
          autoComplete="email"
          icon={<Mail size={20} />}
        />

        <AuthInput
          id="phone"
          label="Nomor Telepon"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="628..."
          value={phone}
          onChange={(event) => updatePhone(event.target.value)}
          autoComplete="tel"
          icon={<Phone size={20} />}
        />

        <AuthInput
          id="password"
          label="Kata Sandi"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => dispatch({ type: "setField", field: "password", value: event.target.value })}
          autoComplete="new-password"
          icon={<Lock size={20} />}
        />

        <AuthInput
          id="confirmPassword"
          label="Konfirmasi Kata Sandi"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => dispatch({ type: "setField", field: "confirmPassword", value: event.target.value })}
          autoComplete="new-password"
          icon={<Lock size={20} />}
        />

        <Button type="submit" className="w-full" icon={<UserPlus size={18} />} loading={loading}>
          Daftar
        </Button>
      </form>
    </AuthCard>
  );
}

"use client";

import { useReducer, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import FormSection from "@/components/ui/FormSection";
import FormStickyActions from "@/components/ui/FormStickyActions";
import NumberStepper from "@/components/ui/NumberStepper";
import { FORM_INPUT_CLASS } from "@/components/ui/formStyles";
import { showWarning } from "@/lib/swal";
import type { AddPatientValues } from "./addPatientFormUtils";

interface AddPatientFormProps {
  readonly initialValues?: Partial<AddPatientValues>;
  readonly mode?: "add" | "edit";
  readonly onSubmit: (values: AddPatientValues) => void | Promise<void>;
  readonly onCancel: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATIENT_INPUT_CLASS = FORM_INPUT_CLASS;
const numericPhone = (value: string | undefined) => (value ?? "").replace(/\D/g, "");

type AddPatientFormState = {
  readonly fullName: string;
  readonly age: string;
  readonly gender: "Pria" | "Wanita" | "";
  readonly phone: string;
  readonly email: string;
  readonly password: string;
  readonly address: string;
  readonly isSubmitting: boolean;
};

type AddPatientFormAction =
  | { readonly type: "field"; readonly field: keyof Omit<AddPatientFormState, "isSubmitting">; readonly value: string }
  | { readonly type: "submitting"; readonly value: boolean };

function addPatientFormReducer(state: AddPatientFormState, action: AddPatientFormAction): AddPatientFormState {
  if (action.type === "submitting") return { ...state, isSubmitting: action.value };
  return { ...state, [action.field]: action.value };
}

export default function AddPatientForm({ initialValues, mode = "add", onSubmit }: AddPatientFormProps) {
  const [state, dispatch] = useReducer(addPatientFormReducer, initialValues, (values): AddPatientFormState => ({
    fullName: values?.fullName ?? "",
    age: values?.age ? String(values.age) : "",
    gender: values?.gender ?? "",
    phone: numericPhone(values?.phone),
    email: values?.email ?? "",
    password: values?.password ?? "",
    address: values?.address ?? "",
    isSubmitting: false,
  }));
  const { fullName, age, gender, phone, email, password, address, isSubmitting } = state;

  const updateField = (field: keyof Omit<AddPatientFormState, "isSubmitting">, value: string) => dispatch({ type: "field", field, value });

  const updatePhone = (value: string) => {
    updateField("phone", value.replace(/\D/g, ""));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

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

    dispatch({ type: "submitting", value: true });
    try {
      await onSubmit({ fullName: trimmedFullName, age: numericAge, gender, phone: trimmedPhone, email: trimmedEmail, password: trimmedPassword, address: trimmedAddress });
    } finally {
      dispatch({ type: "submitting", value: false });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <FormSection>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Nama Lengkap" htmlFor="patientName" required>
            <input id="patientName" name="patientName" type="text" placeholder="Nama pasien" value={fullName} onChange={(event) => updateField("fullName", event.target.value)} className={PATIENT_INPUT_CLASS} aria-label="Nama Lengkap" />
          </FormField>
          <FormField label="Umur" required>
            <NumberStepper id="patientAge" name="patientAge" value={age} min={1} required ariaLabel="Umur pasien" onChange={(value) => updateField("age", value)} />
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 block text-sm font-extrabold text-text-main">
              Kelamin <span className="text-danger">*</span>
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
                    onChange={() => updateField("gender", option)}
                    className="size-5 appearance-none rounded-full border-2 border-muted bg-white bg-clip-content p-[3px] transition-all checked:border-primary checked:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label={`Kelamin ${option}`}
                  />
                  <span className={gender === option ? "text-text-main" : "text-muted"}>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <FormField label="Nomor Telepon" htmlFor="patientPhone" required>
            <input id="patientPhone" name="patientPhone" type="tel" inputMode="numeric" pattern="[0-9]*" placeholder="628..." value={phone} onChange={(event) => updatePhone(event.target.value)} className={PATIENT_INPUT_CLASS} autoComplete="tel" aria-label="Nomor Telepon" />
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Email" htmlFor="patientEmail" required>
            <input id="patientEmail" name="patientEmail" type="email" placeholder="pasien@email.com" autoComplete="username" value={email} onChange={(event) => updateField("email", event.target.value)} className={PATIENT_INPUT_CLASS} aria-label="Email" />
          </FormField>
          <FormField label="Password" htmlFor="patientPassword" required>
            <input id="patientPassword" name="patientPassword" type="password" placeholder="********" autoComplete="new-password" value={password} onChange={(event) => updateField("password", event.target.value)} className={PATIENT_INPUT_CLASS} aria-label="Password" />
          </FormField>
        </div>

        <FormField label="Alamat" htmlFor="patientAddress" required>
          <input id="patientAddress" name="patientAddress" type="text" placeholder="Alamat pasien" value={address} onChange={(event) => updateField("address", event.target.value)} className={PATIENT_INPUT_CLASS} aria-label="Alamat" />
        </FormField>
      </FormSection>

      <FormStickyActions>
        <Button type="submit" icon={<UserPlus size={18} />} loading={isSubmitting}>
          {mode === "add" ? "Simpan Pasien" : "Simpan Perubahan"}
        </Button>
      </FormStickyActions>
    </form>
  );
}

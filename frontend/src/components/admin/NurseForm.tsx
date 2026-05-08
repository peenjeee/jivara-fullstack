"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import FormSection from "@/components/ui/FormSection";
import FormStickyActions from "@/components/ui/FormStickyActions";
import SelectField from "@/components/ui/SelectField";
import { FORM_INPUT_CLASS } from "@/components/ui/formStyles";
import type { NurseGender, NurseRecord, NurseStatus } from "@/lib/mocks/nurses";
import { showWarning } from "@/lib/swal";
import type { NurseFormValues } from "@/store/nurses";

interface NurseFormProps {
  readonly initialValues?: NurseRecord;
  readonly mode?: "add" | "edit";
  readonly onCancel: () => void;
  readonly onSubmit: (values: NurseFormValues) => void;
}

interface NurseFormState {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly gender: NurseGender | "";
  readonly password: string;
  readonly status: NurseStatus | "";
}

const numericPhone = (value: string | undefined) => (value ?? "").replace(/\D/g, "");

export default function NurseForm({ initialValues, mode = "add", onSubmit }: NurseFormProps) {
  const [values, setValues] = useState<NurseFormState>({
    fullName: initialValues?.fullName ?? "",
    email: initialValues?.email ?? "",
    phone: numericPhone(initialValues?.phone),
    gender: initialValues?.gender ?? "",
    password: "",
    status: initialValues?.status ?? "",
  });

  const updateValue = <TKey extends keyof NurseFormState>(key: TKey, value: NurseFormState[TKey]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const updatePhone = (value: string) => {
    updateValue("phone", value.replace(/\D/g, ""));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = values.fullName.trim();
    const trimmedEmail = values.email.trim();
    const trimmedPhone = values.phone.trim();
    const trimmedPassword = values.password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !values.gender || !values.status) {
      showWarning("Harap isi semua kolom perawat.");
      return;
    }

    if (mode === "add" && !trimmedPassword) {
      showWarning("Password sementara wajib diisi.");
      return;
    }

    onSubmit({
      fullName: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      gender: values.gender,
      password: trimmedPassword,
      status: values.status,
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <FormSection>
        <FormField label="Nama Lengkap" required>
          <input id="nurseFullName" name="nurseFullName" type="text" placeholder="Nama perawat" value={values.fullName} onChange={(event) => updateValue("fullName", event.target.value)} className={FORM_INPUT_CLASS} />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Email" required>
            <input id="nurseEmail" name="nurseEmail" type="email" placeholder="perawat@email.com" value={values.email} onChange={(event) => updateValue("email", event.target.value)} className={FORM_INPUT_CLASS} autoComplete="username" />
          </FormField>
          <FormField label="No. Telepon" required>
            <input id="nursePhone" name="nursePhone" type="tel" inputMode="numeric" pattern="[0-9]*" placeholder="628..." value={values.phone} onChange={(event) => updatePhone(event.target.value)} className={FORM_INPUT_CLASS} />
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 block text-sm font-extrabold text-text-main">
              Gender <span className="text-danger">*</span>
            </legend>
            <div className="flex flex-wrap gap-7 py-3">
              {(["Pria", "Wanita"] as const).map((option) => (
                <label key={option} className="flex cursor-pointer items-center gap-2.5 text-sm font-extrabold text-muted transition-colors hover:text-text-main">
                  <input
                    type="radio"
                    name="nurseGender"
                    value={option}
                    checked={values.gender === option}
                    onChange={() => updateValue("gender", option)}
                    className="h-5 w-5 appearance-none rounded-full border-2 border-muted bg-white bg-clip-content p-[3px] transition-all checked:border-primary checked:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className={values.gender === option ? "text-text-main" : "text-muted"}>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <FormField label="Status" required>
            <SelectField id="nurseStatus" value={values.status} placeholder="Pilih" className={FORM_INPUT_CLASS} options={[{ label: "Aktif", value: "Aktif" }, { label: "Nonaktif", value: "Nonaktif" }]} onChange={(value) => updateValue("status", value)} />
          </FormField>
        </div>

        <FormField label={mode === "add" ? "Password Sementara" : "Password Sementara Baru"} required={mode === "add"}>
          <input
            id="nurseTemporaryPassword"
            name="nurseTemporaryPassword"
            type="password"
            value={values.password}
            onChange={(event) => updateValue("password", event.target.value)}
            placeholder={mode === "edit" ? "Kosongkan jika tidak diubah" : "********"}
            className={FORM_INPUT_CLASS}
            autoComplete="new-password"
          />
        </FormField>
      </FormSection>

      <FormStickyActions>
        <Button type="submit">{mode === "add" ? "Tambah Perawat" : "Simpan Perubahan"}</Button>
      </FormStickyActions>
    </form>
  );
}

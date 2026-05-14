"use client";

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  required?: boolean;
  icon?: React.ReactNode;
  labelClassName?: string;
}

const AuthInput = ({ label, id, required = true, icon, className = '', labelClassName = '', name, type, ...props }: AuthInputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isDisabled = Boolean(props.disabled || props.readOnly);
  const isPassword = type === 'password';
  const inputType = isPassword && isPasswordVisible ? 'text' : type;

  return (
    <div>
      <label className={`block text-sm font-semibold text-dark mb-2 ${labelClassName}`} htmlFor={id}>
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className={`pointer-events-none absolute left-5 top-1/2 flex -translate-y-1/2 ${isDisabled ? 'text-muted/55' : 'text-muted'}`}>
            {icon}
          </span>
        )}
        <input
          id={id}
          name={name ?? id}
          type={inputType}
          className={`w-full py-4 ${icon ? 'pl-14' : 'pl-5'} ${isPassword ? 'pr-14' : 'pr-5'} bg-surface shadow-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body disabled:cursor-not-allowed disabled:bg-line/35 disabled:text-muted disabled:opacity-100 ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-5 top-1/2 flex -translate-y-1/2 text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary disabled:cursor-not-allowed disabled:text-muted/55"
            onClick={() => setIsPasswordVisible((current) => !current)}
            disabled={isDisabled}
            aria-label={isPasswordVisible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          >
            {isPasswordVisible ? <EyeOff size={20} strokeWidth={2.2} /> : <Eye size={20} strokeWidth={2.2} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthInput;

import Swal, { type SweetAlertOptions } from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const popupClass = 'rounded-[32px] border border-line bg-white px-6 py-7 text-text-main shadow-[0_24px_80px_rgba(15,23,42,0.22)]';
const titleClass = 'font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main';
const textClass = 'text-sm font-semibold leading-6 text-muted';
const confirmButtonClass = 'mx-1 inline-flex items-center justify-center rounded-full border border-white/10 bg-primary px-7 py-3 text-[13px] font-bold uppercase leading-none tracking-[0.1em] text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/25';
const cancelButtonClass = 'mx-1 inline-flex items-center justify-center rounded-full bg-surface px-7 py-3 text-[13px] font-bold uppercase leading-none tracking-[0.1em] text-text-main transition-colors hover:bg-line focus:outline-none focus:ring-2 focus:ring-primary/20';
const actionsClass = 'mt-7 flex flex-wrap items-center justify-center gap-3';

const Toast = MySwal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: {
    container: 'swal2-toast-container-custom',
    popup: 'rounded-2xl border border-line bg-white px-4 py-3 text-text-main shadow-[0_18px_45px_rgba(15,23,42,0.16)]',
    title: 'text-sm font-extrabold text-text-main',
    timerProgressBar: 'bg-primary',
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

const Alert = MySwal.mixin({
  position: 'center',
  toast: false,
  showConfirmButton: true,
  timer: 3000,
  timerProgressBar: true,
  customClass: {
    popup: popupClass,
    title: titleClass,
    htmlContainer: textClass,
    confirmButton: confirmButtonClass,
    cancelButton: cancelButtonClass,
    actions: actionsClass,
    timerProgressBar: 'bg-primary',
  },
  buttonsStyling: false,
});

/**
 * Menampilkan toast notification di pojok kanan atas
 */
export const showToast = (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  return Toast.fire({
    icon,
    title,
  });
};

/**
 * Menampilkan alert sukses
 */
export const showSuccess = (text: string, title: string = 'Berhasil!', options?: SweetAlertOptions) => {
  return Alert.fire({
    title,
    text,
    icon: 'success',
    ...options,
  });
};

/**
 * Menampilkan alert error
 */
export const showError = (text: string, title: string = 'Gagal!', options?: SweetAlertOptions) => {
  return Alert.fire({
    title,
    text,
    icon: 'error',
    ...options,
  });
};

/**
 * Menampilkan alert peringatan (warning)
 */
export const showWarning = (text: string, title: string = 'Peringatan!', options?: SweetAlertOptions) => {
  return Alert.fire({
    title,
    text,
    icon: 'warning',
    ...options,
  });
};

/**
 * Menampilkan konfirmasi untuk tindakan berbahaya (seperti hapus data)
 */
export const showConfirm = (title: string = 'Apakah Anda yakin?', text: string = "Tindakan ini tidak dapat dibatalkan!", confirmButtonText: string = 'Ya, Hapus!') => {
  return Alert.fire({
    title,
    text,
    icon: 'warning',
    position: 'center',
    toast: false,
    showConfirmButton: true,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Batal',
    reverseButtons: true,
    timer: undefined,
  });
};

/**
 * Menampilkan indikator loading yang tidak bisa ditutup manual oleh user
 */
export const showLoading = (title: string = 'Mohon Tunggu', text: string = 'Memproses permintaan Anda...') => {
  return MySwal.fire({
    title,
    text,
    allowOutsideClick: false,
    showConfirmButton: false,
    customClass: {
      popup: popupClass,
      title: titleClass,
      htmlContainer: textClass,
    },
    didOpen: () => {
      MySwal.showLoading();
    },
  });
};

/**
 * Menutup alert atau loading yang sedang terbuka
 */
export const closeAlert = () => {
  return MySwal.close();
};

export default MySwal;

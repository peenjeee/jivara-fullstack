import Swal, { SweetAlertOptions } from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

/**
 * Base configuration for Toast notifications
 */
const Toast = MySwal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: {
    container: 'swal2-toast-container-custom'
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

/**
 * Base configuration for standard Alerts
 */
const Alert = MySwal.mixin({
  position: 'center',
  toast: false, // Standard modal style
  showConfirmButton: true,
  timer: 3000,
  timerProgressBar: true,
  customClass: {
    confirmButton: 'px-6 py-3 rounded-2xl font-bold bg-primary text-white hover:bg-primary-dark transition-all mx-2',
    cancelButton: 'px-6 py-3 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all mx-2',
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
    position: 'center', // Keep confirmation centered
    toast: false, // Normal modal style
    showConfirmButton: true,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Batal',
    reverseButtons: true,
    timer: undefined, // Don't auto close confirmation
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
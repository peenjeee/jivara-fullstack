import type { SweetAlertOptions } from 'sweetalert2';
import type withReactContent from 'sweetalert2-react-content';

type ReactSwal = ReturnType<typeof withReactContent>;

let swalPromise: Promise<ReactSwal> | null = null;

const getSwal = () => {
  swalPromise ??= Promise.all([
    import('sweetalert2/dist/sweetalert2.all.js'),
    import('sweetalert2-react-content'),
  ]).then(([swalModule, reactContentModule]) => reactContentModule.default(swalModule.default));

  return swalPromise;
};

const popupClass = 'rounded-[32px] border border-line bg-white px-6 py-7 text-text-main shadow-[0_24px_80px_rgba(15,23,42,0.22)]';
const titleClass = 'font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main';
const textClass = 'text-sm font-semibold leading-6 text-muted';
const confirmButtonClass = 'mx-1 inline-flex items-center justify-center rounded-full border-0 bg-primary px-7 py-3 text-[13px] font-bold uppercase leading-none tracking-[0.1em] text-white shadow-none outline-none transition-colors hover:bg-primary-hover focus:outline-none focus:ring-0';
const cancelButtonClass = 'mx-1 inline-flex items-center justify-center rounded-full border-0 bg-surface px-7 py-3 text-[13px] font-bold uppercase leading-none tracking-[0.1em] text-text-main shadow-none outline-none transition-colors hover:bg-line focus:outline-none focus:ring-0';
const actionsClass = 'mt-7 flex flex-wrap items-center justify-center gap-3';

const createToast = (swal: ReactSwal) => swal.mixin({
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
});

const createAlert = (swal: ReactSwal) => swal.mixin({
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
export const showToast = async (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  const swal = await getSwal();

  return createToast(swal).fire({
    icon,
    title,
  });
};

/**
 * Menampilkan alert sukses
 */
export const showSuccess = async (text: string, title: string = 'Berhasil!', options?: SweetAlertOptions) => {
  const swal = await getSwal();

  return createAlert(swal).fire({
    title,
    text,
    icon: 'success',
    ...options,
  });
};

/**
 * Menampilkan alert error
 */
export const showError = async (text: string, title: string = 'Gagal!', options?: SweetAlertOptions) => {
  const swal = await getSwal();

  return createAlert(swal).fire({
    title,
    text,
    icon: 'error',
    ...options,
  });
};

/**
 * Menampilkan alert peringatan (warning)
 */
export const showWarning = async (text: string, title: string = 'Peringatan!', options?: SweetAlertOptions) => {
  const swal = await getSwal();

  return createAlert(swal).fire({
    title,
    text,
    icon: 'warning',
    ...options,
  });
};

/**
 * Menampilkan konfirmasi untuk tindakan berbahaya (seperti hapus data)
 */
export const showConfirm = async (title: string = 'Apakah Anda yakin?', text: string = "Tindakan ini tidak dapat dibatalkan!", confirmButtonText: string = 'Ya, Hapus!') => {
  const swal = await getSwal();

  return createAlert(swal).fire({
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
export const showLoading = async (title: string = 'Mohon Tunggu', text: string = 'Memproses permintaan Anda...') => {
  const swal = await getSwal();

  return swal.fire({
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
      swal.showLoading();
    },
  });
};

/**
 * Menutup alert atau loading yang sedang terbuka
 */
export const closeAlert = async () => {
  const swal = await getSwal();

  return swal.close();
};

export default getSwal;

import axios from "axios";

type ApiErrorLike = {
  response?: {
    status?: number;
    data?: {
      message?: unknown;
    };
  };
};

const isAxiosError = (error: unknown): error is ApiErrorLike => typeof axios.isAxiosError === "function"
  ? axios.isAxiosError(error)
  : Boolean(error && typeof error === "object" && "response" in error);

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!isAxiosError(error)) return fallback;

  const rawMessage = typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message.trim()
    : "";

  if (!error.response) {
    if (/failed to fetch|network error/i.test(rawMessage)) {
      return "Layanan sedang tidak dapat dijangkau. Pastikan backend API aktif lalu coba lagi.";
    }

    if (/timeout|timed out|econnaborted/i.test(rawMessage)) {
      return "Permintaan ke layanan memakan waktu terlalu lama. Coba lagi beberapa saat.";
    }

    return fallback;
  }

  if (error.response?.status === 429) {
    return typeof error.response.data?.message === "string"
      ? error.response.data.message
      : "Terlalu banyak permintaan. Tunggu beberapa saat lalu coba lagi.";
  }

  if (typeof error.response?.data?.message === "string" && /failed to fetch/i.test(error.response.data.message)) {
    return "Layanan sedang tidak dapat dijangkau. Pastikan backend API aktif lalu coba lagi.";
  }

  return typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : fallback;
};

export const isRateLimitError = (error: unknown) => isAxiosError(error) && error.response?.status === 429;

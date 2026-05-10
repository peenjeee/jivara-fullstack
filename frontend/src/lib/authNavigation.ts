export const AUTH_EXPIRED_EVENT = "jivara:auth-expired";

export const notifyAuthExpired = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
};

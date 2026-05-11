export function getFallbackPathForRole(role?: string | null) {
  return role === "super_admin" ? "/admin-approvals" : "/dashboard";
}

export function isPathAllowedForRole(pathname: string, role?: string | null) {
  if (!role) return false;
  if (pathname.startsWith("/account-status")) return role === "admin";
  if (pathname.startsWith("/settings")) return true;
  if (pathname.startsWith("/dashboard")) return role !== "super_admin";
  if (pathname.startsWith("/admin-approvals")) return role === "super_admin";
  if (pathname.startsWith("/activity-log") && role === "super_admin") return true;
  if (pathname.startsWith("/nurses")) return role === "admin" || role === "nurse";
  if (pathname.startsWith("/patients")) return role === "admin" || role === "nurse";
  if (pathname.startsWith("/schedule")) return role === "admin" || role === "nurse" || role === "patient";
  if (pathname.startsWith("/activity-log")) return role === "admin" || role === "nurse" || role === "patient";
  if (pathname.startsWith("/food-scan")) return role === "patient";
  return true;
}

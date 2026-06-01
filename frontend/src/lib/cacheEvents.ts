export const dashboardDataChangedEvent = "jivara:dashboard-data-changed";

export const notifyDashboardDataChanged = (source?: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(dashboardDataChangedEvent, { detail: { source } }));
};

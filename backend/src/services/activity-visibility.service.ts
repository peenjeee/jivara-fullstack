export const hiddenActivityResourceTypes = ["notification", "push_subscription", "user_push_subscription"];

export const hiddenActivityActions = ["user_notification_preference.updated"];

export const isActivityAuditLogHidden = (activity: { action?: string | null; resourceType?: string | null }) => (
  hiddenActivityResourceTypes.includes(activity.resourceType ?? "")
  || hiddenActivityActions.includes(activity.action ?? "")
);

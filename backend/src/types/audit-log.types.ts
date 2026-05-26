export interface AuditLogListQuery {
  user_id?: string;
  userId?: string;
  user_role?: string;
  userRole?: string;
  nurse_id?: string;
  nurseId?: string;
  action?: string;
  status?: string;
  severityFilter?: string;
  activity_category?: "reminder" | "adherence" | "food_scan" | "administration";
  activityCategory?: "reminder" | "adherence" | "food_scan" | "administration";
  resource_type?: string;
  resourceType?: string;
  resource_id?: string;
  resourceId?: string;
  severity?: "success" | "info" | "critical" | "warning";
  search?: string;
  date?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  page?: string;
  limit?: string;
}

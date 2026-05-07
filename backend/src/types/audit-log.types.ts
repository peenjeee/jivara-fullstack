export interface AuditLogListQuery {
  user_id?: string;
  userId?: string;
  action?: string;
  resource_type?: string;
  resourceType?: string;
  resource_id?: string;
  resourceId?: string;
  date?: string;
  page?: string;
  limit?: string;
}

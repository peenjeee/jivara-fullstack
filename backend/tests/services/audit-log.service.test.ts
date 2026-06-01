import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/db", () => ({ db: {} }));

import { sanitizeAuditValue } from "../../src/services/audit-log.service";
import { isActivityAuditLogHidden } from "../../src/services/activity-visibility.service";

describe("audit log service", () => {
  it("redacts sensitive fields inside nested audit changes", () => {
    const sanitized = sanitizeAuditValue({
      requested: {
        password: "plain-password",
        profile: {
          accessToken: "access-token",
          name: "Aman",
        },
      },
      events: [
        { refresh_token: "refresh-token", status: "ok" },
        { secretAnswer: "blue", count: 1 },
      ],
      note: "kept",
    });

    expect(sanitized).toEqual({
      requested: {
        password: "[REDACTED]",
        profile: {
          accessToken: "[REDACTED]",
          name: "Aman",
        },
      },
      events: [
        { refresh_token: "[REDACTED]", status: "ok" },
        { secretAnswer: "[REDACTED]", count: 1 },
      ],
      note: "kept",
    });
  });

  it("hides internal notification preference audit logs from activity surfaces", () => {
    expect(isActivityAuditLogHidden({
      action: "user_notification_preference.updated",
      resourceType: "user",
    })).toBe(true);

    expect(isActivityAuditLogHidden({
      action: "auth.login",
      resourceType: "user",
    })).toBe(false);
  });
});

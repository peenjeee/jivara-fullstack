import DashboardAccountActions from "./DashboardAccountActions";
import DashboardNavItem from "./DashboardNavItem";
import { getDashboardNavItems, type DashboardNavLabel, type DashboardRole } from "./navigation";
import JivaraWordmark from "@/components/ui/JivaraWordmark";
import { useActivityLogStore } from "@/store/activityLog";
import { useAuthStore } from "@/store/auth";

interface DashboardSidebarProps {
  readonly activeItem?: DashboardNavLabel;
  readonly role: DashboardRole;
  readonly onLogout: () => void;
  readonly onNavigate?: () => void;
}

export default function DashboardSidebar({ activeItem, role, onLogout, onNavigate }: DashboardSidebarProps) {
  const userId = useAuthStore((state) => state.user?.id);
  const badgeScopeKey = userId && (role === "patient" || role === "nurse") ? `${role}:${userId}` : null;
  const globalUnreadActivityCount = useActivityLogStore((state) => state.unreadActivityCount);
  const unreadActivityScopeKey = useActivityLogStore((state) => state.unreadActivityScopeKey);
  const unreadActivityCount = useActivityLogStore((state) => {
    if (role === "super_admin" || role === "admin") return 0;
    if (state.unreadActivityScopeKey !== badgeScopeKey) return 0;
    return state.unreadActivityCount ?? 0;
  });
  const isActivityLogLoading = useActivityLogStore((state) => state.isLoading);
  const navItems = getDashboardNavItems(role);

  return (
    <>
      <div className="hidden lg:flex justify-start">
        <h1>
          <JivaraWordmark size="sidebar" priority />
        </h1>
      </div>

      <nav className="mt-8 flex flex-col gap-4" aria-label="Navigasi dashboard">
        {navItems.map((item) => (
          <DashboardNavItem
            key={item.label}
            item={item}
            isActive={activeItem === item.label}
            badgeCount={item.href === "/activity-log" ? unreadActivityCount : 0}
            isBadgeLoading={item.href === "/activity-log" && Boolean(badgeScopeKey) && unreadActivityScopeKey === badgeScopeKey && globalUnreadActivityCount === null && isActivityLogLoading}
            onSelect={() => onNavigate?.()}
          />
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <DashboardAccountActions onLogout={onLogout} />
      </div>
    </>
  );
}

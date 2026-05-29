import DashboardAccountActions from "./DashboardAccountActions";
import DashboardNavItem from "./DashboardNavItem";
import { getDashboardNavItems, type DashboardNavLabel, type DashboardRole } from "./navigation";
import Image from "next/image";
import { useActivityLogStore } from "@/store/activityLog";

interface DashboardSidebarProps {
  readonly activeItem?: DashboardNavLabel;
  readonly role: DashboardRole;
  readonly onLogout: () => void;
  readonly onNavigate?: () => void;
}

export default function DashboardSidebar({ activeItem, role, onLogout, onNavigate }: DashboardSidebarProps) {
  const globalUnreadActivityCount = useActivityLogStore((state) => state.unreadActivityCount);
  const unreadActivityCount = useActivityLogStore((state) => {
    if (role === "super_admin" || role === "admin") return 0;
    return state.unreadActivityCount ?? 0;
  });
  const isActivityLogLoading = useActivityLogStore((state) => state.isLoading);
  const navItems = getDashboardNavItems(role);

  return (
    <>
      <div className="hidden lg:flex justify-start">
        <h1 className="h-[60px] w-[172px] overflow-hidden">
          <Image
            src="/images/logo/notext.png"
            alt="Jivara"
            width={210}
            height={68}
            sizes="190px"
            className="-mt-[58px] h-auto w-[190px]"
          />
        </h1>
      </div>

      <nav className="mt-8 flex flex-col gap-4" aria-label="Navigasi dashboard">
        {navItems.map((item) => (
          <DashboardNavItem
            key={item.label}
            item={item}
            isActive={activeItem === item.label}
            badgeCount={item.href === "/activity-log" ? unreadActivityCount : 0}
            isBadgeLoading={item.href === "/activity-log" && (role === "patient" || role === "nurse") && globalUnreadActivityCount === null && isActivityLogLoading}
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

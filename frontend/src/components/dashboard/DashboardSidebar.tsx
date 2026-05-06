import DashboardAccountActions from "./DashboardAccountActions";
import DashboardNavItem from "./DashboardNavItem";
import { getDashboardNavItems, type DashboardNavLabel, type DashboardRole } from "./navigation";
import Image from "next/image";
import { getUnreadActivityCount } from "@/helpers/activityLogs";
import { patients } from "@/lib/mocks/patients";
import { useActivityLogStore } from "@/store/activityLog";

interface DashboardSidebarProps {
  readonly activeItem?: DashboardNavLabel;
  readonly role: DashboardRole;
  readonly onLogout: () => void;
  readonly onNavigate?: () => void;
}

export default function DashboardSidebar({ activeItem, role, onLogout, onNavigate }: DashboardSidebarProps) {
  const unreadActivityCount = useActivityLogStore((state) => getUnreadActivityCount(state.activities, role === "patient" ? patients[0].id : undefined));
  const navItems = getDashboardNavItems(role);

  return (
    <>
      <div className="hidden lg:flex justify-center">
        <h1>
          <Image
            src="/images/logo/notext.png"
            alt="Jivara"
            width={210}
            height={68}
            sizes="190px"
            className="h-auto w-[190px]"
          />
        </h1>
      </div>

      <nav className="mt-9 flex flex-col gap-4" aria-label="Navigasi dashboard">
        {navItems.map((item) => (
          <DashboardNavItem
            key={item.label}
            item={item}
            isActive={activeItem === item.label}
            badgeCount={item.href === "/activity-log" ? unreadActivityCount : 0}
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

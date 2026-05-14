import DashboardAccountActions from "./DashboardAccountActions";
import DashboardNavItem from "./DashboardNavItem";
import { getDashboardNavItems, isAdminDashboardRole, type DashboardNavLabel, type DashboardRole } from "./navigation";
import Image from "next/image";
import { getUnreadActivityCount } from "@/helpers/activityLogs";
import { useActivityLogStore } from "@/store/activityLog";
import { usePatientDashboardStore } from "@/store/patientDashboard";

interface DashboardSidebarProps {
  readonly activeItem?: DashboardNavLabel;
  readonly role: DashboardRole;
  readonly onLogout: () => void;
  readonly onNavigate?: () => void;
}

export default function DashboardSidebar({ activeItem, role, onLogout, onNavigate }: DashboardSidebarProps) {
  const patientId = usePatientDashboardStore((state) => state.patientId);
  const unreadActivityCount = useActivityLogStore((state) => isAdminDashboardRole(role) ? 0 : getUnreadActivityCount(state.activities, role === "patient" ? patientId ?? undefined : undefined));
  const navItems = getDashboardNavItems(role);

  return (
    <>
      <div className="hidden lg:flex justify-start">
        <h1 className="h-[56px] w-[172px] overflow-hidden">
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

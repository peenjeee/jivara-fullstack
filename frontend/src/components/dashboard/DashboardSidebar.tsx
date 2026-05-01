import DashboardAccountActions from "./DashboardAccountActions";
import DashboardNavItem from "./DashboardNavItem";
import { DASHBOARD_NAV_ITEMS, type DashboardNavLabel } from "./navigation";
import Image from "next/image";

interface DashboardSidebarProps {
  readonly activeItem?: DashboardNavLabel;
  readonly onLogout: () => void;
  readonly onNavigate?: () => void;
}

export default function DashboardSidebar({ activeItem, onLogout, onNavigate }: DashboardSidebarProps) {
  return (
    <>
      <div className="hidden lg:flex justify-center">
        <h1>
          <Image
            src="/images/logo/notext.png"
            alt="Jivara"
            width={210}
            height={68}
            priority
            className="h-auto w-[190px]"
          />
        </h1>
      </div>

      <nav className="mt-9 flex flex-col gap-4" aria-label="Navigasi dashboard">
        {DASHBOARD_NAV_ITEMS.map((item) => (
          <DashboardNavItem
            key={item.label}
            item={item}
            isActive={activeItem === item.label}
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

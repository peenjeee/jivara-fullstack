import DashboardAccountActions from "./DashboardAccountActions";
import DashboardNavItem from "./DashboardNavItem";
import { DASHBOARD_NAV_ITEMS, type DashboardNavLabel } from "./navigation";

interface DashboardSidebarProps {
  readonly activeItem: DashboardNavLabel;
  readonly onActiveChange: (label: DashboardNavLabel) => void;
  readonly onLogout: () => void;
  readonly onNavigate?: () => void;
}

export default function DashboardSidebar({ activeItem, onActiveChange, onLogout, onNavigate }: DashboardSidebarProps) {
  return (
    <>
      <div className="hidden lg:block">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.06em] text-text-main">Jivara</h1>
      </div>

      <nav className="mt-11 flex flex-col gap-4" aria-label="Navigasi dashboard">
        {DASHBOARD_NAV_ITEMS.map((item) => (
          <DashboardNavItem
            key={item.label}
            item={item}
            isActive={activeItem === item.label}
            onSelect={() => {
              onActiveChange(item.label);
              onNavigate?.();
            }}
          />
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <DashboardAccountActions onLogout={onLogout} />
      </div>
    </>
  );
}

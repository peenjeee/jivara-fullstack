"use client";

import { createContext, use } from "react";
import type { ReactNode } from "react";
import type { User } from "@/types/auth";

const DashboardInitialUserContext = createContext<User | null>(null);

interface DashboardInitialUserProviderProps {
  readonly initialUser: User | null;
  readonly children: ReactNode;
}

export function DashboardInitialUserProvider({ initialUser, children }: DashboardInitialUserProviderProps) {
  return (
    <DashboardInitialUserContext.Provider value={initialUser}>
      {children}
    </DashboardInitialUserContext.Provider>
  );
}

export function useDashboardInitialUser() {
  return use(DashboardInitialUserContext);
}

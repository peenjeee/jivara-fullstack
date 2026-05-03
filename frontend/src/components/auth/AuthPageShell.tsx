import type { ReactNode } from "react";
import { SimpleFooter } from "@/components/landing/Footer";
import LogoHomeLink from "@/components/ui/LogoHomeLink";

interface AuthPageShellProps {
  readonly children: ReactNode;
}

export default function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="flex flex-1 items-start justify-center px-5 pt-0 pb-50">
        <section className="flex w-full max-w-md flex-col items-center gap-0">
          <LogoHomeLink priority />
          {children}
        </section>
      </main>
      <SimpleFooter />
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * Auth layout - minimal centered layout for login/auth pages
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-background to-accent/20 p-4">
      {children}
    </div>
  );
}

import type { ReactNode } from "react";
import { StaticFooter } from "./static-footer";
import { StaticHeader } from "./static-header";

interface StaticLayoutProps {
  children: ReactNode;
}

/**
 * Shared layout wrapper for static pages
 * Provides consistent header and footer
 */
export const StaticLayout = ({ children }: StaticLayoutProps) => (
  <div className="min-h-screen bg-background text-foreground">
    <StaticHeader />
    <main className="mx-auto max-w-8xl px-4">{children}</main>
    <StaticFooter />
  </div>
);

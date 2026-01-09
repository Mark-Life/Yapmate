import {
  ConsentManagerDialog,
  ConsentManagerProvider,
  CookieBanner,
} from "@c15t/react";
import { PostHogProvider } from "posthog-js/react";
import type { ReactNode } from "react";
import {
  consentOptions,
  consentTheme,
  dialogTheme,
} from "../../consent-config";
import { posthogOptions } from "../../posthog-config";
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
  <PostHogProvider
    apiKey={process.env.PUBLIC_POSTHOG_KEY ?? ""}
    options={posthogOptions}
  >
    <ConsentManagerProvider options={consentOptions}>
      <div className="min-h-screen bg-background text-foreground">
        <StaticHeader />
        <main className="mx-auto max-w-8xl px-4">{children}</main>
        <StaticFooter />
      </div>
      <CookieBanner legalLinks={["privacyPolicy"]} theme={consentTheme} />
      <ConsentManagerDialog
        legalLinks={["privacyPolicy", "termsOfService"]}
        theme={dialogTheme}
      />
    </ConsentManagerProvider>
  </PostHogProvider>
);

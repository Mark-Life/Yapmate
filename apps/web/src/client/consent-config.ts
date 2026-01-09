/**
 * Shared consent manager configuration
 * Used by both main app layout and static pages
 */

import type { ConsentManagerOptions } from "@c15t/react";
import posthog from "posthog-js";

/**
 * Consent manager provider options
 */
export const consentOptions = {
  mode: "offline" as const,
  ignoreGeoLocation: true,
  consentCategories: ["necessary", "measurement"],
  callbacks: {
    onConsentSet({ preferences }) {
      if (preferences.measurement) {
        posthog.opt_in_capturing();
      } else {
        posthog.opt_out_capturing();
      }
    },
  },
  legalLinks: {
    privacyPolicy: {
      href: "/policy",
      label: "Privacy Policy",
    },
    termsOfService: {
      href: "/terms",
      label: "Terms of Service",
    },
  },
} satisfies ConsentManagerOptions;

/**
 * Theme configuration for cookie consent banner
 * Maps to app's CSS custom properties via style objects
 */
export const consentTheme = {
  "banner.card": {
    style: {
      background: "var(--card)",
      color: "var(--card-foreground)",
      borderColor: "var(--border)",
      borderRadius: "var(--radius)",
      boxShadow:
        "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    },
  },
  "banner.header.title": {
    style: { color: "var(--foreground)" },
  },
  "banner.header.description": {
    style: { color: "var(--muted-foreground)" },
  },
  "banner.header.legal-links.link": {
    style: { color: "var(--primary)" },
  },
  "banner.footer.reject-button": {
    style: {
      background: "transparent",
      color: "var(--muted-foreground)",
      borderColor: "var(--border)",
      borderRadius: "var(--radius)",
      "--button-shadow-neutral-focus": "0 0 0 2px var(--secondary)",
      "--button-shadow-neutral-focus-dark": "0 0 0 2px var(--secondary)",
    },
  },
  "banner.footer.customize-button": {
    style: {
      background: "var(--muted)",
      color: "var(--foreground)",
      borderColor: "var(--border)",
      borderRadius: "var(--radius)",
      "--button-shadow-neutral-focus": "0 0 0 2px var(--secondary)",
      "--button-shadow-neutral-focus-dark": "0 0 0 2px var(--secondary)",
    },
  },
  "banner.footer.accept-button": {
    style: {
      background: "var(--primary)",
      color: "var(--primary-foreground)",
      borderRadius: "var(--radius)",
      borderColor: "var(--primary)",
      "--button-shadow-primary-focus": "0 0 0 2px var(--secondary)",
      "--button-shadow-primary-focus-dark": "0 0 0 2px var(--secondary)",
    },
  },
};

/**
 * Theme configuration for consent manager dialog
 */
export const dialogTheme = {
  "dialog.root": {
    style: {
      background: "var(--card)",
      color: "var(--card-foreground)",
      borderColor: "var(--border)",
      borderRadius: "var(--radius)",
    },
  },
  "dialog.title": {
    style: { color: "var(--foreground)" },
  },
  "dialog.description": {
    style: { color: "var(--muted-foreground)" },
  },
  "dialog.legal-links.link": {
    style: { color: "var(--primary)" },
  },
  "widget.legal-links.link": {
    style: { color: "var(--primary)" },
  },
  "widget.footer.reject-button": {
    style: {
      background: "transparent",
      color: "var(--muted-foreground)",
      borderColor: "var(--border)",
      borderRadius: "var(--radius)",
      "--button-shadow-neutral-focus": "0 0 0 2px var(--secondary)",
      "--button-shadow-neutral-focus-dark": "0 0 0 2px var(--secondary)",
    },
  },
  "widget.footer.accept-button": {
    style: {
      background: "var(--primary)",
      color: "var(--primary-foreground)",
      borderRadius: "var(--radius)",
      borderColor: "var(--primary)",
      "--button-shadow-primary-focus": "0 0 0 2px var(--secondary)",
      "--button-shadow-primary-focus-dark": "0 0 0 2px var(--secondary)",
    },
  },
  "widget.footer.save-button": {
    style: {
      background: "var(--primary)",
      color: "var(--primary-foreground)",
      borderRadius: "var(--radius)",
      borderColor: "var(--primary)",
      "--button-shadow-primary-focus": "0 0 0 2px var(--secondary)",
      "--button-shadow-primary-focus-dark": "0 0 0 2px var(--secondary)",
    },
  },
};

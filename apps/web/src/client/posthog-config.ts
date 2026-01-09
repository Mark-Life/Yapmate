/**
 * Shared PostHog configuration
 * Used by both main app and static pages
 */

/**
 * PostHog initialization options
 * - cookieless_mode: 'on_reject' enables cookieless tracking until consent is given
 */
export const posthogOptions = {
  api_host: process.env.PUBLIC_POSTHOG_HOST,
  defaults: "2025-11-30",
  cookieless_mode: "on_reject",
} as const;

export type MagicLinkResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Sends a magic link email to the provided address
 */
export const signInWithMagicLink = async (
  email: string
): Promise<MagicLinkResult> => {
  const res = await fetch("/api/auth/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error ?? "Failed to send magic link" };
  }

  return res.json();
};

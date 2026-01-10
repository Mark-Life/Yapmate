/**
 * Vault service for managing encrypted secrets
 * Provides functions to create, retrieve, and delete secrets stored in Supabase Vault
 *
 * This service uses PostgreSQL functions via Drizzle ORM to interact with Supabase Vault,
 * bypassing PostgREST schema cache issues by using direct SQL connections.
 */

import { sql } from "drizzle-orm";

import { db } from "../client";

// ─── Error Classes ──────────────────────────────────────────────────────────────

export class VaultError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "VaultError";
    this.cause = cause;
  }
}

export class SecretNotFoundError extends VaultError {
  readonly secretName: string;

  constructor(secretName: string) {
    super(`Secret not found: ${secretName}`);
    this.name = "SecretNotFoundError";
    this.secretName = secretName;
  }
}

// ─── Error Helpers ──────────────────────────────────────────────────────────────

/**
 * Check if an error indicates a secret was not found
 * Handles PostgreSQL exceptions wrapped by Drizzle/Vercel Postgres
 */
const isSecretNotFoundError = (error: unknown): boolean => {
  if (error instanceof SecretNotFoundError) {
    return true;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  if (
    errorString.includes("not found") ||
    errorString.includes("secret not found")
  ) {
    return true;
  }

  // Check error cause for nested PostgreSQL errors
  const errorCause =
    error instanceof Error && "cause" in error
      ? String(error.cause).toLowerCase()
      : "";
  return (
    errorCause.includes("not found") || errorCause.includes("secret not found")
  );
};

// ─── Core Vault Functions ───────────────────────────────────────────────────────

/**
 * Create or update a secret in Supabase Vault
 * @param secretName - Unique name/identifier for the secret
 * @param secretValue - The secret value to store (will be encrypted)
 * @returns The secret name (can be used as secretRef in database)
 */
export const createSecret = async (
  secretName: string,
  secretValue: string
): Promise<string> => {
  try {
    // Supabase Vault create_secret returns UUID, but we can use the name
    // If secret exists, we need to delete it first, then create new one
    await db.execute(sql`DELETE FROM vault.secrets WHERE name = ${secretName}`);

    const result = await db.execute(
      sql`SELECT vault.create_secret(${secretValue}, ${secretName}) AS secret_id`
    );

    const secretId = result[0]?.secret_id;

    if (!secretId) {
      throw new VaultError("Failed to create secret: No data returned");
    }

    return secretName;
  } catch (error) {
    if (error instanceof VaultError) {
      throw error;
    }
    throw new VaultError(
      `Failed to create secret: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
};

/**
 * Retrieve a decrypted secret from Supabase Vault
 * @param secretName - The name/identifier of the secret to retrieve
 * @returns The decrypted secret value
 */
export const getSecret = async (secretName: string): Promise<string> => {
  try {
    const result = await db.execute(
      sql`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ${secretName}`
    );

    const secretValue = result[0]?.decrypted_secret;

    if (!secretValue) {
      throw new SecretNotFoundError(secretName);
    }

    return secretValue as string;
  } catch (error) {
    if (error instanceof SecretNotFoundError || error instanceof VaultError) {
      throw error;
    }

    if (isSecretNotFoundError(error)) {
      throw new SecretNotFoundError(secretName);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new VaultError(`Failed to retrieve secret: ${errorMessage}`, error);
  }
};

/**
 * Delete a secret from Supabase Vault
 * @param secretName - The name/identifier of the secret to delete
 * @returns True if secret was deleted, false if it didn't exist
 */
export const deleteSecret = async (secretName: string): Promise<boolean> => {
  try {
    // Check if secret exists first
    const checkResult = await db.execute(
      sql`SELECT 1 FROM vault.secrets WHERE name = ${secretName} LIMIT 1`
    );

    if (checkResult.length === 0) {
      return false;
    }

    // Delete from vault.secrets table
    await db.execute(sql`DELETE FROM vault.secrets WHERE name = ${secretName}`);

    return true;
  } catch (error) {
    throw new VaultError(
      `Failed to delete secret: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
};

// ─── MCP-Specific Functions ─────────────────────────────────────────────────────

/**
 * Generate a secret name for an MCP server
 * Format: mcp-{userId}-{serverId}
 * @param userId - The user ID (UUID or text)
 * @param serverId - The MCP server ID (UUID)
 */
export const getMcpSecretName = (userId: string, serverId: string): string =>
  `mcp-${userId}-${serverId}`;

/**
 * Get MCP API key from Vault
 * @param userId - The user ID (UUID or text)
 * @param serverId - The MCP server ID (UUID)
 * @returns The decrypted API key string
 */
export const getMcpSecret = async (
  userId: string,
  serverId: string
): Promise<string> => {
  const secretName = getMcpSecretName(userId, serverId);
  return await getSecret(secretName);
};

/**
 * Store MCP API key in Vault
 * @param userId - The user ID (UUID or text)
 * @param serverId - The MCP server ID (UUID)
 * @param apiKey - The API key to store (will be encrypted)
 * @returns The secret name
 */
export const setMcpSecret = async (
  userId: string,
  serverId: string,
  apiKey: string
): Promise<string> => {
  const secretName = getMcpSecretName(userId, serverId);
  return await createSecret(secretName, apiKey);
};

/**
 * Delete MCP API key from Vault
 * @param userId - The user ID (UUID or text)
 * @param serverId - The MCP server ID (UUID)
 * @returns True if secret was deleted, false if it didn't exist
 */
export const deleteMcpSecret = async (
  userId: string,
  serverId: string
): Promise<boolean> => {
  const secretName = getMcpSecretName(userId, serverId);
  return await deleteSecret(secretName);
};

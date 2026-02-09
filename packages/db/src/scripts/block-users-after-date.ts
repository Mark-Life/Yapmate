/**
 * Block all users registered on or after 2026-02-02.
 * Sets blockedAt = now() where createdAt >= 2026-02-02 and not already blocked.
 *
 * Run: bun --env-file ../../.env src/scripts/block-users-after-date.ts
 */

import { and, gte, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../schema/users";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

const cutoffDate = new Date("2026-02-02T00:00:00Z");

const result = await db
  .update(users)
  .set({ blockedAt: sql`now()` })
  .where(and(gte(users.createdAt, cutoffDate), isNull(users.blockedAt)))
  .returning({ id: users.id, email: users.email, createdAt: users.createdAt });

console.log(`Blocked ${result.length} users:`);
for (const user of result) {
  console.log(`  ${user.email} (created: ${user.createdAt})`);
}

await client.end();

import { drizzle } from 'drizzle-orm/vercel-postgres';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is not set');
}

export const db = drizzle();

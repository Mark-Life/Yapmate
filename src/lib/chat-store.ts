/**
 * Creates a new chat and returns its ID (UUID v7)
 * TODO: When implementing persistence, create the chat record in the database here
 */
export async function createChat(): Promise<string> {
  return Bun.randomUUIDv7();
}


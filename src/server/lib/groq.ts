import { createGroq } from "@ai-sdk/groq";

if (!process.env.GROQ_API_KEY || typeof process.env.GROQ_API_KEY !== "string") {
  throw new Error("GROQ_API_KEY is not set");
}

export const groqClient = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

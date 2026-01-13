/**
 * Transcription API route handler
 * Handles POST for /api/transcribe using Groq Whisper
 */

import { experimental_transcribe as transcribe } from "ai";
import { groqClient } from "../../lib/groq";
import { getCurrentUserId } from "../../lib/supabase";

// Groq Whisper has a 25MB limit, we use 20MB for safety margin
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * Transcribes audio using Groq Whisper API
 */
export const transcribeHandler = {
  async POST(req: Request) {
    try {
      const userId = await getCurrentUserId(req);
      if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const formData = await req.formData();
      const audioFile = formData.get("audio") as File | null;

      if (!audioFile) {
        return Response.json(
          { error: "Audio file is required" },
          { status: 400 }
        );
      }

      // Validate file size
      if (audioFile.size > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (audioFile.size / (1024 * 1024)).toFixed(1);
        return Response.json(
          {
            error: `File too large (${sizeMB}MB). Maximum size is 20MB.`,
          },
          { status: 413 }
        );
      }

      // Convert File to Buffer
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      // Transcribe using Groq Whisper
      const result = await transcribe({
        model: groqClient.transcription("whisper-large-v3-turbo"),
        audio: audioBuffer,
        providerOptions: {
          groq: {
            language: "en",
          },
        },
      });

      return Response.json({ text: result.text });
    } catch (error) {
      console.error("Error in POST /api/transcribe:", error);
      return Response.json(
        { error: "Failed to transcribe audio" },
        { status: 500 }
      );
    }
  },
};

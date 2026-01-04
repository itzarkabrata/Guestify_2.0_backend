import { genAI, LLM_MODEL } from "./config/index.js";
import { Prompt } from "./config/prompt.config.js";
import { redisClient } from "../lib/redis.config.js";

export class LLMController {
  static async generate(req, res) {
    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const { sessionId, payload, instruction } = req.body;

    if (!sessionId) {
      res.status(400).end("Session ID required");
      return;
    }

    let chunkId = 0;
    let fullText = "";

    // Fetch session from Redis
    const sessionRaw = await redisClient.get(sessionId);
    let prompt;

    if (!sessionRaw) {
      // First-time generation
      prompt = Prompt.buildPrompt(payload, instruction);

      await redisClient.set(
        sessionId,
        JSON.stringify({
          coreData: payload,
          agreementMarkdown: "",
          version: 1,
        })
      );
    } else {
      // Update existing agreement
      const session = JSON.parse(sessionRaw);

      prompt = Prompt.updatePrompt(
        session.agreementMarkdown,
        instruction
      );
    }

    try {
      const response = await genAI.models.generateContentStream({
        model: LLM_MODEL,
        contents: prompt,
      });

      for await (const chunk of response) {
        if (!chunk.text) continue;

        chunkId++;
        fullText += chunk.text;

        res.write(
          `data: ${JSON.stringify({
            chunk_id: chunkId,
            chunk_type: "markdown",
            content: chunk.text,
            is_final: false,
          })}\n\n`
        );
      }

      // Save updated agreement to Redis
      const session = sessionRaw ? JSON.parse(sessionRaw) : {};
      await redisClient.set(
        sessionId,
        JSON.stringify({
          ...session,
          agreementMarkdown: fullText,
          version: (session.version || 1) + 1,
        }),
        "EX",
        2*60*60 // 2 hours expiry
      );

      // Done
      res.write(
        `data: ${JSON.stringify({
          chunk_type: "done",
          is_final: true,
        })}\n\n`
      );

      res.end();
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({
          chunk_type: "error",
          message: error.message,
          is_final: true,
        })}\n\n`
      );
      res.end();
    }
  }
}

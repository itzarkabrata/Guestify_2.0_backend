import { geminimodel } from "./config/index.js";
import { buildPrompt, Prompt } from "./config/prompt.config.js";
import { redisClient } from "../lib/redis.config.js";

export class LLMModel {
  static async generateResponse(req, res) {
    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.flushHeaders();

    const { sessionId, payload } = req?.body;
    
    if(!sessionId){
        throw new Error("Session ID is missing")
    };
    let buffer = "";
    let prompt = "";

    if(redisClient.exists(sessionId)){
        prompt = Prompt.updatePrompt(redisClient?.get(sessionId), "");
    }else{
        prompt = Prompt.buildPrompt(payload);
    }

    try {
      // Start Gemini streaming
      const result = await geminimodel.generateContentStream({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
        },
      });

      // Stream tokens as they arrive
      for await (const chunk of result.stream) {
        const text = chunk.text();
        buffer += text;

        if (text) {
          res.write(`event: message\ndata: ${JSON.stringify(text)}\n\n`);
        }
      }

      const agreementJSON = JSON.parse(buffer);

      redisClient?.set(sessionId, {
        agreementJSON,
        coreData: payload,
        updatedAt: Date.now(),
      });

      res.write(`event: done\ndata: ${JSON.stringify({ sessionId })}\n\n`);
      res.end();

    } catch (error) {
      console.error("Stream error:", error);
      res.write(`event: error\ndata: "Generation failed: ${error.message}"\n\n`);
      res.end();
    }
  }
}

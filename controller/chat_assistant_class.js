import Chat from "../models/chat_assistant.js";
import { getChatContext, pushChat } from "../server-utils/chatRedis.js";
import { rateLimit } from "../server-utils/rateLimiter.js";
import { callLLM } from "../services/llm_service.js";
import { searchKnowledge } from "../services/vectorSearch_service.js";

export class ChatAssistant {
  static async chat(req, res) {
    try {
      const { message, sessionId, page } = req.body;
      const userId = req.user?.id;

      // =========================
      // VALIDATION
      // =========================
      if (!message || !sessionId) {
        throw new Error("message and sessionId are required");
      }

      // =========================
      // RATE LIMIT
      // =========================
      const isRateLimited = await rateLimit(
        `rate_limit:chat:${sessionId}`,
        20,
        60
      );

      if (isRateLimited) {
        return res.status(429).json({
          message: "Too many requests. Please try again later.",
        });
      }

      // =========================
      // REDIS: USER MESSAGE
      // =========================
      await pushChat(sessionId, {
        role: "user",
        content: message,
      });

      const history = await getChatContext(sessionId);

      // =========================
      // VECTOR SEARCH
      // =========================
      const knowledgeResults = await searchKnowledge(message);
      // console.log("Knowledge Results:", knowledgeResults);

      const MIN_SCORE = 0.75;

      const trustedKnowledge = knowledgeResults
        .filter((k) => k.score >= MIN_SCORE)
        .map((k) => k.content);

      if (trustedKnowledge.length === 0) {
        return res.status(200).json({
          message: "Assistant response generated successfully",
          data: {
            reply:
              "I don’t have that information based on the available website content. Please visit the Contact Us section to reach the administrators for further assistance.",
          },
        });
      }

      const hasReliableKnowledge = trustedKnowledge.length > 0;

      // =========================
      // PROMPT
      // =========================
      const messages = [
        {
          role: "system",
          content: `
You are an in-app assistant for this website.

STRICT RULES:
- Answer ONLY using the provided website knowledge.
- Do NOT use prior or general knowledge.
- Do NOT invent, infer, or generalize.
- Do NOT mention features not explicitly present.

If the knowledge is insufficient:
Respond ONLY with this message:

"I don’t have that information based on the available website content. Please visit the Contact Us section to reach the administrators for further assistance."
          `.trim(),
        },
        {
          role: "system",
          content:
            "This website is a student PG accommodation platform in India. It is NOT a hospitality SaaS, PMS, CRM, or guest management system.",
        },

        ...(hasReliableKnowledge
          ? [
            {
              role: "system",
              content: `Website knowledge:\n\n${trustedKnowledge.join(
                "\n\n"
              )}`,
            },
          ]
          : [
            {
              role: "system",
              content:
                "Website knowledge is insufficient to answer this question.",
            },
          ]),

        ...(page
          ? [
            {
              role: "system",
              content: `User is currently on the ${page} page.`,
            },
          ]
          : []),

        ...history,
      ];

      // =========================
      // LLM CALL
      // =========================
      const assistantReply = await callLLM(messages);

      // =========================
      // REDIS: ASSISTANT MESSAGE
      // =========================
      await pushChat(sessionId, {
        role: "assistant",
        content: assistantReply,
      });

      // =========================
      // MONGO PERSISTENCE (TTL)
      // =========================
      await Chat.insertMany([
        {
          sessionId,
          userId,
          role: "user",
          content: message,
        },
        {
          sessionId,
          userId,
          role: "assistant",
          content: assistantReply,
        },
      ]);

      return res.status(200).json({
        message: "Assistant response generated successfully",
        data: {
          reply: assistantReply,
        },
      });
    } catch (error) {
      console.error(error.message);
      const statusCode =
        error instanceof TypeError ||
          error instanceof EvalError ||
          error instanceof ReferenceError
          ? 400
          : 500;
      return res.status(statusCode).json({
        message: "Chat assistant failed",
        error: error.message,
      });
    }
  }
}

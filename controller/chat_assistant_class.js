// import mongoose from "mongoose";
import Chat from "../models/chat.model.js";
import { rateLimit } from "../server-utils/rateLimiter.js";
import { callLLM } from "../services/llm_service.js";

// import { Database } from "../lib/connect.js";

export class ChatAssistant {

    static async chat(req, res) {
        try {
            const { message, sessionId, page } = req.body;
            const userId = req.user?.id; // optional (if auth middleware exists)

            // Basic validation
            if (!message || !sessionId) {
                throw new Error("message and sessionId are required");
            }

            // Rate limiting using Redis
            const isRateLimited = await rateLimit(`chat:${sessionId}`, 20, 60);
            if (isRateLimited) {
                return res.status(429).json({
                    message: "Too many requests. Please try again later.",
                });
            }

            // Fetch last conversation for context
            const history = await Chat.find({ sessionId })
                .sort({ createdAt: -1 })
                .limit(6)
                .lean();

            // Construct prompt for LLM
            const messages = [
                {
                    role: "system",
                    content:
                        "You are a helpful in-app assistant that guides users on how to use this web application.",
                },
                ...(page
                    ? [
                        {
                            role: "system",
                            content: `User is currently on the ${page} page.`,
                        },
                    ]
                    : []),
                ...history.reverse().map((chat) => ({
                    role: chat.role,
                    content: chat.content,
                })),
                {
                    role: "user",
                    content: message,
                },
            ];

            // Call OpenRouter (LLM)
            const assistantReply = await callLLM(messages);

            // Save conversation
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

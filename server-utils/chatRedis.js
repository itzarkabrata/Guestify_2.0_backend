import { redisClient } from "../lib/redis.config.js";

const CHAT_TTL = 60 * 30; // 30 minutes
const MAX_MESSAGES = 10;

export async function pushChat(sessionId, message) {
  const key = `chat_history:${sessionId}`;

  await redisClient.lpush(key, JSON.stringify(message));
  await redisClient.ltrim(key, 0, MAX_MESSAGES - 1);
  await redisClient.expire(key, CHAT_TTL);
}

export async function getChatContext(sessionId) {
  const key = `chat_history:${sessionId}`;

  const data = await redisClient.lrange(key, 0, -1);
  return data.map((d) => JSON.parse(d)).reverse();
}

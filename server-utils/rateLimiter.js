import { redisClient } from "../lib/redis.config.js";

export const rateLimit = async (key, limit = 20, ttl = 60) => {
  const count = await redisClient.incr(key);

  if (count === 1) {
    await redisClient.expire(key, ttl);
  }

  return count > limit;
};

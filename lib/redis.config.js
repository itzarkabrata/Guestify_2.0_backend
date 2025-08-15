import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not set");
}

// Create a Redis client
export const redisClient = new Redis(redisUrl);
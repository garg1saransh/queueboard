import Redis from "ioredis";
import { getEnv } from "@/lib/env";

const globalForRedis = globalThis as typeof globalThis & {
  redis?: Redis;
  redisSubscriber?: Redis;
};

function createRedisClient(label: string): Redis {
  const client = new Redis(getEnv().REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on("error", (error: Error) => {
    console.error(`[redis:${label}]`, error.message);
  });

  return client;
}

/** Shared Redis connection for queues and publishing events. */
export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = createRedisClient("main");
  }
  return globalForRedis.redis;
}

/** Dedicated subscriber connection (required by Redis pub/sub). */
export function getRedisSubscriber(): Redis {
  if (!globalForRedis.redisSubscriber) {
    globalForRedis.redisSubscriber = createRedisClient("subscriber");
  }
  return globalForRedis.redisSubscriber;
}

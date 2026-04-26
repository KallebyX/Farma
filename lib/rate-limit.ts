import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Limiter = {
  limit: (key: string) => Promise<{ success: boolean; remaining: number; reset: number }>;
};

function buildLimiter(): Limiter {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    const upstash = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "farma:invite",
    });
    return {
      limit: async (key) => {
        const r = await upstash.limit(key);
        return { success: r.success, remaining: r.remaining, reset: r.reset };
      },
    };
  }

  // In-memory fallback for development.
  const buckets = new Map<string, number[]>();
  const WINDOW_MS = 60_000;
  const MAX = 5;
  return {
    limit: async (key) => {
      const now = Date.now();
      const recent = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
      if (recent.length >= MAX) {
        return { success: false, remaining: 0, reset: recent[0] + WINDOW_MS };
      }
      recent.push(now);
      buckets.set(key, recent);
      return { success: true, remaining: MAX - recent.length, reset: now + WINDOW_MS };
    },
  };
}

export const inviteRateLimit = buildLimiter();

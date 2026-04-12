// ---------------------------------------------------------------------------
// Rate Limiter distribuído usando Upstash Redis
//
// Em produção: usa @upstash/ratelimit + @upstash/redis (distribuído, serverless-safe)
// Em desenvolvimento (sem variáveis Upstash): fallback para Map em memória
// ---------------------------------------------------------------------------

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Interface pública (mantém compatibilidade com o restante do código)
// ---------------------------------------------------------------------------

interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  resetAt:   number;
}

interface RateLimitOptions {
  limit:    number; // máximo de tentativas
  windowMs: number; // janela de tempo em ms
}

// ---------------------------------------------------------------------------
// Implementação Upstash (produção)
// ---------------------------------------------------------------------------

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

function createUpstashLimiter(opts: RateLimitOptions) {
  const redis = Redis.fromEnv();
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.limit, `${opts.windowMs} ms`),
    analytics: false,
    prefix: "rl",
  });
}

// ---------------------------------------------------------------------------
// Implementação em memória (desenvolvimento / fallback)
// ---------------------------------------------------------------------------

interface InMemoryRecord {
  count:   number;
  resetAt: number;
}

const memoryStore = new Map<string, InMemoryRecord>();

function checkInMemory(
  key: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const now    = Date.now();
  const record = memoryStore.get(key);

  if (!record || record.resetAt < now) {
    const resetAt = now + opts.windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.limit - 1, resetAt };
  }

  if (record.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return {
    allowed: true,
    remaining: opts.limit - record.count,
    resetAt: record.resetAt,
  };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  if (hasUpstash) {
    const limiter = createUpstashLimiter(opts);
    const { success, remaining, reset } = await limiter.limit(key);
    return { allowed: success, remaining, resetAt: reset };
  }

  // Fallback em memória (dev)
  return checkInMemory(key, opts);
}

export async function clearRateLimit(key: string): Promise<void> {
  if (hasUpstash) {
    const redis = Redis.fromEnv();
    // Remove todas as chaves de rate limit para este identificador
    const keys = await redis.keys(`rl:${key}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return;
  }

  memoryStore.delete(key);
}

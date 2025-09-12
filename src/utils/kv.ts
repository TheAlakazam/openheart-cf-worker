import { ReactionData, RateLimitData, Env, ReactionType } from '../types';

export class KVUtils {
  private reactions: KVNamespace;
  private rateLimits: KVNamespace;

  constructor(env: Env) {
    this.reactions = env.REACTIONS;
    this.rateLimits = env.RATE_LIMITS;
  }

  async getReactions(postSlug: string): Promise<ReactionData> {
    const key = `reactions:${postSlug}`;
    const stored = await this.reactions.get(key);
    
    if (!stored) {
      return {
        postSlug,
        reactions: {
          heart: 0,
          lightbulb: 0,
          fire: 0,
          thinking: 0,
          hundred: 0,
        },
        lastUpdated: new Date().toISOString(),
      };
    }

    try {
      return JSON.parse(stored);
    } catch {
      return {
        postSlug,
        reactions: {
          heart: 0,
          lightbulb: 0,
          fire: 0,
          thinking: 0,
          hundred: 0,
        },
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async updateReaction(postSlug: string, reactionType: ReactionType): Promise<ReactionData> {
    const current = await this.getReactions(postSlug);
    current.reactions[reactionType]++;
    current.lastUpdated = new Date().toISOString();
    
    const key = `reactions:${postSlug}`;
    await this.reactions.put(key, JSON.stringify(current));
    
    return current;
  }

  async getRateLimit(key: string): Promise<RateLimitData | null> {
    const stored = await this.rateLimits.get(key);
    if (!stored) return null;
    
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  async updateRateLimit(key: string, data: RateLimitData, ttlSeconds?: number): Promise<void> {
    const options = ttlSeconds ? { expirationTtl: ttlSeconds } : undefined;
    await this.rateLimits.put(key, JSON.stringify(data), options);
  }

  async deleteRateLimit(key: string): Promise<void> {
    await this.rateLimits.delete(key);
  }

  generatePostRateLimitKey(ip: string, postSlug: string): string {
    return `post-rate:${ip}:${postSlug}`;
  }

  generateGlobalRateLimitKey(ip: string): string {
    return `global-rate:${ip}`;
  }

  generateCooldownKey(ip: string): string {
    return `cooldown:${ip}`;
  }
}
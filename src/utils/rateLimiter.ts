import { RateLimitCheck, RateLimitData, Env } from '../types';
import { KVUtils } from './kv';

export class RateLimiter {
  private kvUtils: KVUtils;
  private maxPostReactions: number;
  private maxGlobalReactions: number;
  private cooldownSeconds: number;

  constructor(env: Env) {
    this.kvUtils = new KVUtils(env);
    this.maxPostReactions = parseInt(env.MAX_REACTIONS_PER_POST_PER_DAY || '3');
    this.maxGlobalReactions = parseInt(env.MAX_REACTIONS_PER_IP_PER_HOUR || '10');
    this.cooldownSeconds = parseFloat(env.REACTION_COOLDOWN_SECONDS || '0.5');
  }

  async checkRateLimit(ip: string, postSlug: string): Promise<RateLimitCheck> {
    const now = Date.now();

    const cooldownCheck = await this.checkCooldown(ip, now);
    if (!cooldownCheck.allowed) {
      return cooldownCheck;
    }

    const postCheck = await this.checkPostRateLimit(ip, postSlug, now);
    if (!postCheck.allowed) {
      return postCheck;
    }

    const globalCheck = await this.checkGlobalRateLimit(ip, now);
    if (!globalCheck.allowed) {
      return globalCheck;
    }

    return { allowed: true };
  }

  private async checkCooldown(ip: string, now: number): Promise<RateLimitCheck> {
    const cooldownKey = this.kvUtils.generateCooldownKey(ip);
    const lastRequest = await this.kvUtils.getRateLimit(cooldownKey);
    
    if (lastRequest) {
      const timeSinceLastRequest = (now - lastRequest.lastRequest) / 1000;
      if (timeSinceLastRequest < this.cooldownSeconds) {
        const resetTime = lastRequest.lastRequest + (this.cooldownSeconds * 1000);
        return {
          allowed: false,
          reason: `Cooldown active. Please wait ${this.cooldownSeconds} seconds between reactions.`,
          resetTime,
        };
      }
    }

    return { allowed: true };
  }

  private async checkPostRateLimit(ip: string, postSlug: string, now: number): Promise<RateLimitCheck> {
    const postKey = this.kvUtils.generatePostRateLimitKey(ip, postSlug);
    const postLimit = await this.kvUtils.getRateLimit(postKey);
    
    const dayStart = this.getDayStart(now);
    
    if (postLimit) {
      if (postLimit.windowStart < dayStart) {
        await this.kvUtils.deleteRateLimit(postKey);
      } else if (postLimit.count >= this.maxPostReactions) {
        const resetTime = dayStart + (24 * 60 * 60 * 1000);
        return {
          allowed: false,
          reason: `Daily limit exceeded for this post. You can add ${this.maxPostReactions} reactions per post per day.`,
          resetTime,
        };
      }
    }

    return { allowed: true };
  }

  private async checkGlobalRateLimit(ip: string, now: number): Promise<RateLimitCheck> {
    const globalKey = this.kvUtils.generateGlobalRateLimitKey(ip);
    const globalLimit = await this.kvUtils.getRateLimit(globalKey);
    
    const hourStart = this.getHourStart(now);
    
    if (globalLimit) {
      if (globalLimit.windowStart < hourStart) {
        await this.kvUtils.deleteRateLimit(globalKey);
      } else if (globalLimit.count >= this.maxGlobalReactions) {
        const resetTime = hourStart + (60 * 60 * 1000);
        return {
          allowed: false,
          reason: `Hourly limit exceeded. You can add ${this.maxGlobalReactions} reactions per hour globally.`,
          resetTime,
        };
      }
    }

    return { allowed: true };
  }

  async recordReaction(ip: string, postSlug: string): Promise<void> {
    const now = Date.now();

    await this.updateCooldown(ip, now);
    await this.updatePostRateLimit(ip, postSlug, now);
    await this.updateGlobalRateLimit(ip, now);
  }

  private async updateCooldown(ip: string, now: number): Promise<void> {
    const cooldownKey = this.kvUtils.generateCooldownKey(ip);
    const data: RateLimitData = {
      count: 1,
      windowStart: now,
      lastRequest: now,
    };
    
    await this.kvUtils.updateRateLimit(cooldownKey, data, 2);
  }

  private async updatePostRateLimit(ip: string, postSlug: string, now: number): Promise<void> {
    const postKey = this.kvUtils.generatePostRateLimitKey(ip, postSlug);
    const existing = await this.kvUtils.getRateLimit(postKey);
    const dayStart = this.getDayStart(now);
    
    const data: RateLimitData = {
      count: existing && existing.windowStart >= dayStart ? existing.count + 1 : 1,
      windowStart: dayStart,
      lastRequest: now,
    };
    
    const secondsUntilMidnight = Math.ceil((dayStart + (24 * 60 * 60 * 1000) - now) / 1000);
    await this.kvUtils.updateRateLimit(postKey, data, secondsUntilMidnight);
  }

  private async updateGlobalRateLimit(ip: string, now: number): Promise<void> {
    const globalKey = this.kvUtils.generateGlobalRateLimitKey(ip);
    const existing = await this.kvUtils.getRateLimit(globalKey);
    const hourStart = this.getHourStart(now);
    
    const data: RateLimitData = {
      count: existing && existing.windowStart >= hourStart ? existing.count + 1 : 1,
      windowStart: hourStart,
      lastRequest: now,
    };
    
    const secondsUntilNextHour = Math.ceil((hourStart + (60 * 60 * 1000) - now) / 1000);
    await this.kvUtils.updateRateLimit(globalKey, data, secondsUntilNextHour);
  }

  private getDayStart(timestamp: number): number {
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
  }

  private getHourStart(timestamp: number): number {
    const date = new Date(timestamp);
    date.setUTCMinutes(0, 0, 0);
    return date.getTime();
  }
}
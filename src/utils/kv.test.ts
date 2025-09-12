import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KVUtils } from './kv';
import { Env, ReactionData, RateLimitData } from '../types';

// Mock environment for testing
const mockEnv: Env = {
  REACTIONS: {
    get: async () => null,
    put: async () => undefined,
    delete: async () => undefined,
  } as any,
  RATE_LIMITS: {
    get: async () => null,
    put: async () => undefined,
    delete: async () => undefined,
  } as any,
  MAX_REACTIONS_PER_POST_PER_DAY: '3',
  MAX_REACTIONS_PER_IP_PER_HOUR: '10',
  REACTION_COOLDOWN_SECONDS: '0.5',
};

describe('KVUtils', () => {
  let kvUtils: KVUtils;
  let mockReactionsKV: any;
  let mockRateLimitsKV: any;

  beforeEach(() => {
    mockReactionsKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    mockRateLimitsKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const testEnv = {
      ...mockEnv,
      REACTIONS: mockReactionsKV,
      RATE_LIMITS: mockRateLimitsKV,
    };

    kvUtils = new KVUtils(testEnv);
  });

  describe('getReactions', () => {
    it('should return default reaction data when no data exists', async () => {
      mockReactionsKV.get.mockResolvedValue(null);
      
      const result = await kvUtils.getReactions('test-post');
      
      expect(result).toEqual({
        postSlug: 'test-post',
        reactions: {
          heart: 0,
          lightbulb: 0,
          fire: 0,
          thinking: 0,
          hundred: 0,
        },
        lastUpdated: expect.any(String),
      });
      
      expect(mockReactionsKV.get).toHaveBeenCalledWith('reactions:test-post');
    });

    it('should return parsed reaction data when data exists', async () => {
      const storedData: ReactionData = {
        postSlug: 'test-post',
        reactions: { heart: 5, lightbulb: 2, fire: 1, thinking: 0, hundred: 3 },
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };
      
      mockReactionsKV.get.mockResolvedValue(JSON.stringify(storedData));
      
      const result = await kvUtils.getReactions('test-post');
      
      expect(result).toEqual(storedData);
    });

    it('should return default data when stored data is invalid JSON', async () => {
      mockReactionsKV.get.mockResolvedValue('invalid json');
      
      const result = await kvUtils.getReactions('test-post');
      
      expect(result.reactions).toEqual({
        heart: 0,
        lightbulb: 0,
        fire: 0,
        thinking: 0,
        hundred: 0,
      });
    });
  });

  describe('updateReaction', () => {
    it('should increment reaction count and update timestamp', async () => {
      const existingData: ReactionData = {
        postSlug: 'test-post',
        reactions: { heart: 5, lightbulb: 2, fire: 1, thinking: 0, hundred: 3 },
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };
      
      mockReactionsKV.get.mockResolvedValue(JSON.stringify(existingData));
      
      const result = await kvUtils.updateReaction('test-post', 'heart');
      
      expect(result.reactions.heart).toBe(6);
      expect(result.lastUpdated).not.toBe(existingData.lastUpdated);
      expect(mockReactionsKV.put).toHaveBeenCalledWith(
        'reactions:test-post',
        JSON.stringify(result)
      );
    });
  });

  describe('rate limit operations', () => {
    it('should get rate limit data', async () => {
      const rateLimitData: RateLimitData = {
        count: 2,
        windowStart: 1234567890,
        lastRequest: 1234567900,
      };
      
      mockRateLimitsKV.get.mockResolvedValue(JSON.stringify(rateLimitData));
      
      const result = await kvUtils.getRateLimit('test-key');
      
      expect(result).toEqual(rateLimitData);
    });

    it('should return null when no rate limit data exists', async () => {
      mockRateLimitsKV.get.mockResolvedValue(null);
      
      const result = await kvUtils.getRateLimit('test-key');
      
      expect(result).toBeNull();
    });

    it('should update rate limit data with TTL', async () => {
      const rateLimitData: RateLimitData = {
        count: 1,
        windowStart: 1234567890,
        lastRequest: 1234567900,
      };
      
      await kvUtils.updateRateLimit('test-key', rateLimitData, 3600);
      
      expect(mockRateLimitsKV.put).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(rateLimitData),
        { expirationTtl: 3600 }
      );
    });

    it('should delete rate limit data', async () => {
      await kvUtils.deleteRateLimit('test-key');
      
      expect(mockRateLimitsKV.delete).toHaveBeenCalledWith('test-key');
    });
  });

  describe('key generation', () => {
    it('should generate correct rate limit keys', () => {
      expect(kvUtils.generatePostRateLimitKey('1.2.3.4', 'test-post'))
        .toBe('post-rate:1.2.3.4:test-post');
      
      expect(kvUtils.generateGlobalRateLimitKey('1.2.3.4'))
        .toBe('global-rate:1.2.3.4');
      
      expect(kvUtils.generateCooldownKey('1.2.3.4'))
        .toBe('cooldown:1.2.3.4');
    });
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from './rateLimiter';
import { Env, RateLimitData } from '../types';

// Mock the current time for consistent testing
const MOCK_NOW = 1704067200000; // 2024-01-01 00:00:00 UTC

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockKV: any;
  let mockEnv: Env;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);

    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    mockEnv = {
      REACTIONS: mockKV,
      RATE_LIMITS: mockKV,
      MAX_REACTIONS_PER_POST_PER_DAY: '3',
      MAX_REACTIONS_PER_IP_PER_HOUR: '10',
      REACTION_COOLDOWN_SECONDS: '0.5',
    };

    rateLimiter = new RateLimiter(mockEnv);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('cooldown checking', () => {
    it('should allow request when no previous cooldown exists', async () => {
      mockKV.get.mockResolvedValue(null);

      const result = await rateLimiter.checkRateLimit('1.2.3.4', 'test-post');

      expect(result.allowed).toBe(true);
    });

    it('should block request during cooldown period', async () => {
      const cooldownData: RateLimitData = {
        count: 1,
        windowStart: MOCK_NOW,
        lastRequest: MOCK_NOW - 200, // 0.2 seconds ago (within 0.5s cooldown)
      };

      mockKV.get
        .mockResolvedValueOnce(JSON.stringify(cooldownData)) // cooldown check
        .mockResolvedValue(null); // other checks

      const result = await rateLimiter.checkRateLimit('1.2.3.4', 'test-post');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cooldown active');
      expect(result.resetTime).toBeDefined();
    });

    it('should allow request after cooldown period expires', async () => {
      const cooldownData: RateLimitData = {
        count: 1,
        windowStart: MOCK_NOW,
        lastRequest: MOCK_NOW - 600, // 0.6 seconds ago (past 0.5s cooldown)
      };

      mockKV.get
        .mockResolvedValueOnce(JSON.stringify(cooldownData)) // cooldown check
        .mockResolvedValue(null); // other checks return null (no limits)

      const result = await rateLimiter.checkRateLimit('1.2.3.4', 'test-post');

      expect(result.allowed).toBe(true);
    });
  });

  describe('per-post rate limiting', () => {
    it('should allow request under daily post limit', async () => {
      const postData: RateLimitData = {
        count: 2, // Under limit of 3
        windowStart: MOCK_NOW - 3600000, // 1 hour ago but same day
        lastRequest: MOCK_NOW - 1000,
      };

      mockKV.get
        .mockResolvedValueOnce(null) // cooldown check
        .mockResolvedValueOnce(JSON.stringify(postData)) // post rate check
        .mockResolvedValue(null); // global rate check

      const result = await rateLimiter.checkRateLimit('1.2.3.4', 'test-post');

      expect(result.allowed).toBe(true);
    });

    it('should block request when daily post limit exceeded', async () => {
      const dayStart = new Date(MOCK_NOW);
      dayStart.setUTCHours(0, 0, 0, 0);

      const postData: RateLimitData = {
        count: 3, // At limit of 3
        windowStart: dayStart.getTime(),
        lastRequest: MOCK_NOW - 1000,
      };

      mockKV.get
        .mockResolvedValueOnce(null) // cooldown check
        .mockResolvedValueOnce(JSON.stringify(postData)) // post rate check
        .mockResolvedValue(null); // global rate check

      const result = await rateLimiter.checkRateLimit('1.2.3.4', 'test-post');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily limit exceeded');
    });

    it('should reset post limit for new day', async () => {
      const yesterdayStart = MOCK_NOW - (24 * 60 * 60 * 1000);
      
      const oldPostData: RateLimitData = {
        count: 3,
        windowStart: yesterdayStart,
        lastRequest: yesterdayStart + 1000,
      };

      mockKV.get
        .mockResolvedValueOnce(null) // cooldown check
        .mockResolvedValueOnce(JSON.stringify(oldPostData)) // post rate check
        .mockResolvedValue(null); // global rate check

      const result = await rateLimiter.checkRateLimit('1.2.3.4', 'test-post');

      expect(result.allowed).toBe(true);
      expect(mockKV.delete).toHaveBeenCalled(); // Old data should be deleted
    });
  });

  describe('global rate limiting', () => {
    it('should allow request under hourly global limit', async () => {
      const hourStart = new Date(MOCK_NOW);
      hourStart.setUTCMinutes(0, 0, 0);

      const globalData: RateLimitData = {
        count: 5, // Under limit of 10
        windowStart: hourStart.getTime(),
        lastRequest: MOCK_NOW - 1000,
      };

      mockKV.get
        .mockResolvedValueOnce(null) // cooldown check
        .mockResolvedValueOnce(null) // post rate check
        .mockResolvedValueOnce(JSON.stringify(globalData)); // global rate check

      const result = await rateLimiter.checkRateLimit('1.2.3.4', 'test-post');

      expect(result.allowed).toBe(true);
    });

    it('should block request when hourly global limit exceeded', async () => {
      const hourStart = new Date(MOCK_NOW);
      hourStart.setUTCMinutes(0, 0, 0);

      const globalData: RateLimitData = {
        count: 10, // At limit of 10
        windowStart: hourStart.getTime(),
        lastRequest: MOCK_NOW - 1000,
      };

      mockKV.get
        .mockResolvedValueOnce(null) // cooldown check
        .mockResolvedValueOnce(null) // post rate check
        .mockResolvedValueOnce(JSON.stringify(globalData)); // global rate check

      const result = await rateLimiter.checkRateLimit('1.2.3.4', 'test-post');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Hourly limit exceeded');
    });
  });

  describe('recordReaction', () => {
    it('should update all rate limit counters', async () => {
      mockKV.get.mockResolvedValue(null); // No existing data

      await rateLimiter.recordReaction('1.2.3.4', 'test-post');

      // Should make 3 put calls: cooldown, post rate, global rate
      expect(mockKV.put).toHaveBeenCalledTimes(3);

      // Verify cooldown update
      expect(mockKV.put).toHaveBeenCalledWith(
        'cooldown:1.2.3.4',
        JSON.stringify({
          count: 1,
          windowStart: MOCK_NOW,
          lastRequest: MOCK_NOW,
        }),
        { expirationTtl: 60 } // 60 seconds TTL (KV minimum)
      );

      // Verify post rate update (2nd call)
      const postCall = mockKV.put.mock.calls[1];
      expect(postCall[0]).toBe('post-rate:1.2.3.4:test-post');
      expect(postCall[1]).toContain('"count":1');
      expect(postCall[2]).toEqual({ expirationTtl: expect.any(Number) });

      // Verify global rate update (3rd call)
      const globalCall = mockKV.put.mock.calls[2];
      expect(globalCall[0]).toBe('global-rate:1.2.3.4');
      expect(globalCall[1]).toContain('"count":1');
      expect(globalCall[2]).toEqual({ expirationTtl: expect.any(Number) });
    });

    it('should increment existing counters', async () => {
      const dayStart = new Date(MOCK_NOW);
      dayStart.setUTCHours(0, 0, 0, 0);
      
      const hourStart = new Date(MOCK_NOW);
      hourStart.setUTCMinutes(0, 0, 0);

      const existingPostData: RateLimitData = {
        count: 1,
        windowStart: dayStart.getTime(),
        lastRequest: MOCK_NOW - 1000,
      };

      const existingGlobalData: RateLimitData = {
        count: 2,
        windowStart: hourStart.getTime(),
        lastRequest: MOCK_NOW - 1000,
      };

      mockKV.get
        .mockResolvedValueOnce(JSON.stringify(existingPostData)) // post rate data
        .mockResolvedValueOnce(JSON.stringify(existingGlobalData)); // global rate data

      await rateLimiter.recordReaction('1.2.3.4', 'test-post');

      // Verify post count incremented
      const postUpdateCall = mockKV.put.mock.calls.find(call => 
        call[0] === 'post-rate:1.2.3.4:test-post'
      );
      expect(postUpdateCall[1]).toContain('"count":2');

      // Verify global count incremented
      const globalUpdateCall = mockKV.put.mock.calls.find(call => 
        call[0] === 'global-rate:1.2.3.4'
      );
      expect(globalUpdateCall[1]).toContain('"count":3');
    });
  });

  describe('time window calculations', () => {
    it('should calculate correct day boundaries', async () => {
      const testTime = new Date('2024-01-01T15:30:45.123Z').getTime();
      vi.setSystemTime(testTime);

      const rateLimiterAtTime = new RateLimiter(mockEnv);
      mockKV.get.mockResolvedValue(null);

      await rateLimiterAtTime.recordReaction('1.2.3.4', 'test-post');

      // Find the post rate limit call
      const postCall = mockKV.put.mock.calls.find(call => 
        call[0].includes('post-rate')
      );
      
      const postData = JSON.parse(postCall[1]);
      const expectedDayStart = new Date('2024-01-01T00:00:00.000Z').getTime();
      
      expect(postData.windowStart).toBe(expectedDayStart);
    });

    it('should calculate correct hour boundaries', async () => {
      const testTime = new Date('2024-01-01T15:30:45.123Z').getTime();
      vi.setSystemTime(testTime);

      const rateLimiterAtTime = new RateLimiter(mockEnv);
      mockKV.get.mockResolvedValue(null);

      await rateLimiterAtTime.recordReaction('1.2.3.4', 'test-post');

      // Find the global rate limit call
      const globalCall = mockKV.put.mock.calls.find(call => 
        call[0].includes('global-rate')
      );
      
      const globalData = JSON.parse(globalCall[1]);
      const expectedHourStart = new Date('2024-01-01T15:00:00.000Z').getTime();
      
      expect(globalData.windowStart).toBe(expectedHourStart);
    });
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from './index';
import { Env } from './types';

describe('OpenHeart API Integration Tests', () => {
  let env: Env;
  let ctx: ExecutionContext;
  let mockKV: any;

  beforeEach(() => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    env = {
      REACTIONS: mockKV,
      RATE_LIMITS: mockKV,
      MAX_REACTIONS_PER_POST_PER_DAY: '3',
      MAX_REACTIONS_PER_IP_PER_HOUR: '10',
      REACTION_COOLDOWN_SECONDS: '0.5',
    };

    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any;
  });

  describe('CORS handling', () => {
    it('should handle OPTIONS requests', async () => {
      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'OPTIONS',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    });
  });

  describe('GET /reactions/:slug', () => {
    it('should return default reaction data for new post', async () => {
      mockKV.get.mockResolvedValue(null);

      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

      const data = await response.json();
      expect(data).toEqual({
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
    });

    it('should return existing reaction data', async () => {
      const existingData = {
        postSlug: 'test-post',
        reactions: {
          heart: 5,
          lightbulb: 2,
          fire: 1,
          thinking: 0,
          hundred: 3,
        },
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockKV.get.mockResolvedValue(JSON.stringify(existingData));

      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(existingData);
    });

    it('should handle invalid slug', async () => {
      const request = new Request('https://api.example.com/reactions/', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('BAD_REQUEST');
    });
  });

  describe('POST /reactions/:slug', () => {
    beforeEach(() => {
      // Mock no existing rate limits
      mockKV.get.mockResolvedValue(null);
    });

    it('should add reaction successfully', async () => {
      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: JSON.stringify({ reaction: 'heart' }),
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.reactions.heart).toBe(1);
      expect(data.message).toContain('heart reaction added successfully');

      // Verify KV operations
      expect(mockKV.put).toHaveBeenCalledWith(
        'reactions:test-post',
        expect.stringContaining('"heart":1')
      );
    });

    it('should reject invalid reaction type', async () => {
      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: JSON.stringify({ reaction: 'invalid' }),
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('BAD_REQUEST');
      expect(data.message).toContain('Invalid reaction type');
    });

    it('should reject missing content-type', async () => {
      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: JSON.stringify({ reaction: 'heart' }),
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Content-Type must be application/json');
    });

    it('should reject invalid JSON', async () => {
      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: 'invalid json',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Invalid JSON');
    });

    it('should reject empty body', async () => {
      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: '',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Request body cannot be empty');
    });

    it('should handle rate limiting', async () => {
      // Mock rate limit exceeded
      const cooldownData = {
        count: 1,
        windowStart: Date.now(),
        lastRequest: Date.now() - 200, // Within cooldown period
      };

      mockKV.get.mockResolvedValue(JSON.stringify(cooldownData));

      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: JSON.stringify({ reaction: 'heart' }),
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();
      
      const data = await response.json();
      expect(data.error).toBe('TOO_MANY_REQUESTS');
      expect(data.message).toContain('Cooldown active');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid routes', async () => {
      const request = new Request('https://api.example.com/invalid', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('NOT_FOUND');
    });

    it('should handle unsupported HTTP methods', async () => {
      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'DELETE',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toBe('METHOD_NOT_ALLOWED');
    });

    it('should handle KV errors gracefully', async () => {
      mockKV.get.mockRejectedValue(new Error('KV Error'));

      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Routing edge cases', () => {
    it('should handle missing slug', async () => {
      const request = new Request('https://api.example.com/reactions', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Post slug is required');
    });

    it('should handle empty slug', async () => {
      const request = new Request('https://api.example.com/reactions/', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Post slug is required');
    });

    it('should handle root path', async () => {
      const request = new Request('https://api.example.com/', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toContain('Available routes');
    });
  });

  describe('IP extraction', () => {
    it('should extract IP from CF-Connecting-IP header', async () => {
      mockKV.get.mockResolvedValue(null);

      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: JSON.stringify({ reaction: 'heart' }),
      });

      await worker.fetch(request, env, ctx);

      // Verify that rate limiting was called with the correct IP
      const rateLimitCalls = mockKV.put.mock.calls.filter(call => 
        call[0].includes('1.2.3.4')
      );
      expect(rateLimitCalls.length).toBeGreaterThan(0);
    });

    it('should fallback to X-Forwarded-For header', async () => {
      mockKV.get.mockResolvedValue(null);

      const request = new Request('https://api.example.com/reactions/test-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '5.6.7.8, 9.10.11.12',
        },
        body: JSON.stringify({ reaction: 'heart' }),
      });

      await worker.fetch(request, env, ctx);

      // Verify that rate limiting was called with the first IP from X-Forwarded-For
      const rateLimitCalls = mockKV.put.mock.calls.filter(call => 
        call[0].includes('5.6.7.8')
      );
      expect(rateLimitCalls.length).toBeGreaterThan(0);
    });
  });
});
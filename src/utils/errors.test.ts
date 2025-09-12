import { describe, it, expect } from 'vitest';
import { 
  ApiErrorHandler, 
  handleCors, 
  createSuccessResponse, 
  getClientIP, 
  sanitizeSlug, 
  validateReactionType 
} from './errors';

describe('ApiErrorHandler', () => {
  it('should create error objects with correct properties', () => {
    const error = ApiErrorHandler.badRequest('Test message');
    expect(error).toEqual({
      error: 'BAD_REQUEST',
      message: 'Test message',
      statusCode: 400,
    });
  });

  it('should create different error types', () => {
    expect(ApiErrorHandler.unauthorized().statusCode).toBe(401);
    expect(ApiErrorHandler.forbidden().statusCode).toBe(403);
    expect(ApiErrorHandler.notFound().statusCode).toBe(404);
    expect(ApiErrorHandler.methodNotAllowed().statusCode).toBe(405);
    expect(ApiErrorHandler.tooManyRequests().statusCode).toBe(429);
    expect(ApiErrorHandler.internalServerError().statusCode).toBe(500);
  });

  it('should convert errors to Response objects', () => {
    const error = ApiErrorHandler.badRequest('Test');
    const response = ApiErrorHandler.toResponse(error);
    
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('handleCors', () => {
  it('should return CORS response for OPTIONS request', () => {
    const request = new Request('https://example.com', { method: 'OPTIONS' });
    const response = handleCors(request);
    
    expect(response).not.toBeNull();
    expect(response!.status).toBe(204);
    expect(response!.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should return null for non-OPTIONS request', () => {
    const request = new Request('https://example.com', { method: 'GET' });
    const response = handleCors(request);
    
    expect(response).toBeNull();
  });
});

describe('createSuccessResponse', () => {
  it('should create success response with correct headers', () => {
    const data = { test: 'value' };
    const response = createSuccessResponse(data);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should use custom status code', () => {
    const response = createSuccessResponse({}, 201);
    expect(response.status).toBe(201);
  });
});

describe('getClientIP', () => {
  it('should return CF-Connecting-IP when available', () => {
    const request = new Request('https://example.com', {
      headers: { 'CF-Connecting-IP': '1.2.3.4' }
    });
    
    expect(getClientIP(request)).toBe('1.2.3.4');
  });

  it('should return X-Forwarded-For when CF-Connecting-IP not available', () => {
    const request = new Request('https://example.com', {
      headers: { 'X-Forwarded-For': '5.6.7.8, 9.10.11.12' }
    });
    
    expect(getClientIP(request)).toBe('5.6.7.8');
  });

  it('should return X-Real-IP as fallback', () => {
    const request = new Request('https://example.com', {
      headers: { 'X-Real-IP': '13.14.15.16' }
    });
    
    expect(getClientIP(request)).toBe('13.14.15.16');
  });

  it('should return localhost as final fallback', () => {
    const request = new Request('https://example.com');
    expect(getClientIP(request)).toBe('127.0.0.1');
  });
});

describe('sanitizeSlug', () => {
  it('should convert to lowercase', () => {
    expect(sanitizeSlug('MyPost')).toBe('mypost');
  });

  it('should remove invalid characters', () => {
    expect(sanitizeSlug('my-post@#$%')).toBe('my-post');
  });

  it('should preserve valid characters', () => {
    expect(sanitizeSlug('my-post_123')).toBe('my-post_123');
  });

  it('should limit length to 100 characters', () => {
    const longSlug = 'a'.repeat(150);
    expect(sanitizeSlug(longSlug)).toHaveLength(100);
  });

  it('should throw error for invalid input', () => {
    expect(() => sanitizeSlug('')).toThrow('Invalid slug');
    expect(() => sanitizeSlug(null as any)).toThrow('Invalid slug');
    expect(() => sanitizeSlug(123 as any)).toThrow('Invalid slug');
  });
});

describe('validateReactionType', () => {
  it('should accept valid reaction types', () => {
    expect(validateReactionType('heart')).toBe(true);
    expect(validateReactionType('lightbulb')).toBe(true);
    expect(validateReactionType('fire')).toBe(true);
    expect(validateReactionType('thinking')).toBe(true);
    expect(validateReactionType('hundred')).toBe(true);
  });

  it('should reject invalid reaction types', () => {
    expect(validateReactionType('invalid')).toBe(false);
    expect(validateReactionType('thumbsup')).toBe(false);
    expect(validateReactionType('')).toBe(false);
    expect(validateReactionType('Heart')).toBe(false); // case sensitive
  });
});
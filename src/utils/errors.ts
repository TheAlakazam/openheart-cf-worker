import { ApiError, DEFAULT_CORS_HEADERS } from '../types';

export class ApiErrorHandler {
  static createError(statusCode: number, error: string, message: string): ApiError {
    return {
      error,
      message,
      statusCode,
    };
  }

  static badRequest(message: string = 'Bad Request'): ApiError {
    return this.createError(400, 'BAD_REQUEST', message);
  }

  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return this.createError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message: string = 'Forbidden'): ApiError {
    return this.createError(403, 'FORBIDDEN', message);
  }

  static notFound(message: string = 'Not Found'): ApiError {
    return this.createError(404, 'NOT_FOUND', message);
  }

  static methodNotAllowed(message: string = 'Method Not Allowed'): ApiError {
    return this.createError(405, 'METHOD_NOT_ALLOWED', message);
  }

  static tooManyRequests(message: string = 'Too Many Requests'): ApiError {
    return this.createError(429, 'TOO_MANY_REQUESTS', message);
  }

  static internalServerError(message: string = 'Internal Server Error'): ApiError {
    return this.createError(500, 'INTERNAL_SERVER_ERROR', message);
  }

  static toResponse(error: ApiError): Response {
    return new Response(JSON.stringify(error), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...DEFAULT_CORS_HEADERS,
      },
    });
  }
}

export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: DEFAULT_CORS_HEADERS,
    });
  }
  return null;
}

export function createSuccessResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...DEFAULT_CORS_HEADERS,
    },
  });
}

export function getClientIP(request: Request): string {
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  const xRealIP = request.headers.get('X-Real-IP');
  
  return cfConnectingIP || 
         (xForwardedFor && xForwardedFor.split(',')[0].trim()) || 
         xRealIP || 
         '127.0.0.1';
}

export function sanitizeSlug(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Invalid slug');
  }
  
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '')
    .substring(0, 100);
}

export function validateReactionType(reaction: string): boolean {
  const validReactions = ['heart', 'lightbulb', 'fire', 'thinking', 'hundred'];
  return validReactions.includes(reaction);
}
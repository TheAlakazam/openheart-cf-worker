import { Env, ReactionRequest, ReactionType } from '../types';
import { KVUtils } from '../utils/kv';
import { RateLimiter } from '../utils/rateLimiter';
import { 
  ApiErrorHandler, 
  createSuccessResponse, 
  getClientIP, 
  sanitizeSlug, 
  validateReactionType 
} from '../utils/errors';

export async function handlePostReaction(
  request: Request,
  env: Env,
  slug: string
): Promise<Response> {
  try {
    const sanitizedSlug = sanitizeSlug(slug);
    if (!sanitizedSlug) {
      return ApiErrorHandler.toResponse(
        ApiErrorHandler.badRequest('Invalid post slug format')
      );
    }

    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return ApiErrorHandler.toResponse(
        ApiErrorHandler.badRequest('Content-Type must be application/json')
      );
    }

    let requestData: ReactionRequest;
    try {
      const body = await request.text();
      if (!body.trim()) {
        return ApiErrorHandler.toResponse(
          ApiErrorHandler.badRequest('Request body cannot be empty')
        );
      }
      requestData = JSON.parse(body);
    } catch {
      return ApiErrorHandler.toResponse(
        ApiErrorHandler.badRequest('Invalid JSON in request body')
      );
    }

    if (!requestData.reaction) {
      return ApiErrorHandler.toResponse(
        ApiErrorHandler.badRequest('Reaction type is required')
      );
    }

    if (!validateReactionType(requestData.reaction)) {
      return ApiErrorHandler.toResponse(
        ApiErrorHandler.badRequest(
          'Invalid reaction type. Allowed: heart, lightbulb, fire, thinking, hundred'
        )
      );
    }

    const clientIP = getClientIP(request);
    if (!clientIP) {
      return ApiErrorHandler.toResponse(
        ApiErrorHandler.badRequest('Unable to determine client IP')
      );
    }

    const rateLimiter = new RateLimiter(env);
    const rateLimitCheck = await rateLimiter.checkRateLimit(clientIP, sanitizedSlug);

    if (!rateLimitCheck.allowed) {
      const response = ApiErrorHandler.toResponse(
        ApiErrorHandler.tooManyRequests(rateLimitCheck.reason || 'Rate limit exceeded')
      );
      
      if (rateLimitCheck.resetTime) {
        response.headers.set('Retry-After', Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000).toString());
        response.headers.set('X-RateLimit-Reset', new Date(rateLimitCheck.resetTime).toISOString());
      }
      
      return response;
    }

    const kvUtils = new KVUtils(env);
    const updatedReactions = await kvUtils.updateReaction(sanitizedSlug, requestData.reaction as ReactionType);

    await rateLimiter.recordReaction(clientIP, sanitizedSlug);

    return createSuccessResponse({
      success: true,
      reactions: updatedReactions.reactions,
      message: `${requestData.reaction} reaction added successfully`,
    }, 201);

  } catch (error) {
    console.error('Error posting reaction:', error);
    
    return ApiErrorHandler.toResponse(
      ApiErrorHandler.internalServerError(
        error instanceof Error ? error.message : 'Failed to add reaction'
      )
    );
  }
}
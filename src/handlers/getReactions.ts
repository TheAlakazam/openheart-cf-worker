import { Env } from '../types';
import { KVUtils } from '../utils/kv';
import { ApiErrorHandler, createSuccessResponse, sanitizeSlug } from '../utils/errors';

export async function handleGetReactions(
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

    const kvUtils = new KVUtils(env);
    const reactionData = await kvUtils.getReactions(sanitizedSlug);

    return createSuccessResponse({
      postSlug: reactionData.postSlug,
      reactions: reactionData.reactions,
      lastUpdated: reactionData.lastUpdated,
    });

  } catch (error) {
    console.error('Error getting reactions:', error);
    
    return ApiErrorHandler.toResponse(
      ApiErrorHandler.internalServerError(
        error instanceof Error ? error.message : 'Failed to retrieve reactions'
      )
    );
  }
}
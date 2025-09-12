import { Env } from './types';
import { ApiErrorHandler, handleCors } from './utils/errors';
import { handleGetReactions } from './handlers/getReactions';
import { handlePostReaction } from './handlers/postReaction';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const corsResponse = handleCors(request);
      if (corsResponse) {
        return corsResponse;
      }

      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);

      if (pathSegments.length === 0) {
        return ApiErrorHandler.toResponse(
          ApiErrorHandler.notFound('API endpoint not found. Available routes: GET /reactions/:slug, POST /reactions/:slug')
        );
      }

      if (pathSegments[0] !== 'reactions') {
        return ApiErrorHandler.toResponse(
          ApiErrorHandler.notFound('Invalid route. Available routes: GET /reactions/:slug, POST /reactions/:slug')
        );
      }

      if (pathSegments.length < 2) {
        return ApiErrorHandler.toResponse(
          ApiErrorHandler.badRequest('Post slug is required. Format: /reactions/:slug')
        );
      }

      const slug = pathSegments[1];

      if (!slug) {
        return ApiErrorHandler.toResponse(
          ApiErrorHandler.badRequest('Post slug cannot be empty')
        );
      }

      const method = request.method.toUpperCase();

      switch (method) {
        case 'GET':
          return await handleGetReactions(request, env, slug);

        case 'POST':
          return await handlePostReaction(request, env, slug);

        default:
          return ApiErrorHandler.toResponse(
            ApiErrorHandler.methodNotAllowed(`Method ${method} not allowed. Supported methods: GET, POST`)
          );
      }

    } catch (error) {
      console.error('Unhandled error:', error);
      
      return ApiErrorHandler.toResponse(
        ApiErrorHandler.internalServerError(
          error instanceof Error ? error.message : 'An unexpected error occurred'
        )
      );
    }
  },
};
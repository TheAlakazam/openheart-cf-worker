export interface ReactionData {
  postSlug: string;
  reactions: {
    heart: number;
    lightbulb: number;
    fire: number;
    thinking: number;
    hundred: number;
  };
  lastUpdated: string;
}

export interface ReactionRequest {
  reaction: keyof ReactionData['reactions'];
  postSlug: string;
}

export interface ReactionResponse {
  success: boolean;
  reactions: ReactionData['reactions'];
  message?: string;
}

export interface RateLimitData {
  count: number;
  windowStart: number;
  lastRequest: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  resetTime?: number;
}

export interface Env {
  REACTIONS: KVNamespace;
  RATE_LIMITS: KVNamespace;
  MAX_REACTIONS_PER_POST_PER_DAY: string;
  MAX_REACTIONS_PER_IP_PER_HOUR: string;
  REACTION_COOLDOWN_SECONDS: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export type ReactionType = 'heart' | 'lightbulb' | 'fire' | 'thinking' | 'hundred';

export const VALID_REACTIONS: ReactionType[] = ['heart', 'lightbulb', 'fire', 'thinking', 'hundred'];

export interface CorsHeaders extends Record<string, string> {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Max-Age': string;
}

export const DEFAULT_CORS_HEADERS: CorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
# OpenHeart Reaction System - Cloudflare Worker API

[![Tests](https://github.com/piyushjaipuriyar/openheart-cf-worker/actions/workflows/test.yml/badge.svg)](https://github.com/piyushjaipuriyar/openheart-cf-worker/actions/workflows/test.yml)
[![Deploy](https://github.com/piyushjaipuriyar/openheart-cf-worker/actions/workflows/deploy.yml/badge.svg)](https://github.com/piyushjaipuriyar/openheart-cf-worker/actions/workflows/deploy.yml)
[![Coverage](https://img.shields.io/badge/coverage-87%25-brightgreen)](https://github.com/piyushjaipuriyar/openheart-cf-worker)

A high-performance serverless API for managing post reactions built with Cloudflare Workers and KV storage.

## Features

- **Global Performance**: Sub-200ms response times worldwide via Cloudflare's edge network
- **Rate Limiting**: Multi-tier rate limiting system with IP-based tracking
- **Spam Prevention**: Built-in protection against reaction spam
- **Real-time Reactions**: Support for 5 reaction types (heart, lightbulb, fire, thinking, hundred)
- **CORS Support**: Full CORS configuration for frontend integration

## Rate Limiting Rules

- **Per Post**: 3 reactions per post per IP per day
- **Global**: 10 reactions per IP per hour globally  
- **Cooldown**: 0.5-second cooldown between reactions

## API Endpoints

### GET /reactions/:slug
Retrieve reaction counts for a post.

**Response:**
```json
{
  "postSlug": "example-post",
  "reactions": {
    "heart": 15,
    "lightbulb": 8,
    "fire": 3,
    "thinking": 12,
    "hundred": 7
  },
  "lastUpdated": "2024-01-01T12:00:00.000Z"
}
```

### POST /reactions/:slug
Add a reaction to a post.

**Request:**
```json
{
  "reaction": "heart"
}
```

**Response:**
```json
{
  "success": true,
  "reactions": {
    "heart": 16,
    "lightbulb": 8,
    "fire": 3,
    "thinking": 12,
    "hundred": 7
  },
  "message": "heart reaction added successfully"
}
```

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure KV namespaces in wrangler.toml:**
   - Update the KV namespace IDs for production and staging environments
   - Create KV namespaces in your Cloudflare dashboard

3. **Deploy:**
```bash
npm run deploy
```

## Development

```bash
npm run dev
```

## Testing

The project includes comprehensive tests with 87%+ code coverage:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

**Test Coverage:**
- ✅ Unit tests for all utility functions
- ✅ Integration tests for API endpoints  
- ✅ Rate limiting logic validation
- ✅ Error handling scenarios
- ✅ CORS and security features
- ✅ Edge cases and validation

## CI/CD Pipeline

This project uses GitHub Actions for automated testing and deployment:

### 🧪 Continuous Integration
- **Automated Testing**: Runs on all PRs and pushes to `main`
- **Multi-Node Testing**: Tests against Node.js 18 and 20
- **Code Quality**: ESLint, TypeScript compilation, and test coverage
- **Coverage Reporting**: Integrated with Codecov

### 🚀 Continuous Deployment
- **Preview Deployments**: Automatic preview URLs for every PR
- **Production**: Auto-deploys `main` branch to production
- **Manual Deployment**: Workflow dispatch for on-demand deployments
- **Zero Complexity**: No separate staging environments to manage

### ⚡ Cloudflare Workers Preview System
- **Unique URLs**: Each PR gets its own preview URL (e.g., `branch-name.your-worker.workers.dev`)
- **Automatic Updates**: Preview updates with every commit to the PR
- **Isolated Testing**: Each PR runs independently without conflicts
- **No Setup Required**: Uses Cloudflare's built-in preview functionality

### Required Secrets
Configure these in your GitHub repository settings:

```bash
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
CODECOV_TOKEN=your_codecov_token      # Optional for coverage reporting
```

## Configuration

Edit `wrangler.toml` to configure:
- KV namespace bindings
- Rate limiting parameters

### Environment Setup
1. Create KV namespaces in Cloudflare Dashboard:
   ```bash
   # Production namespaces
   wrangler kv:namespace create "REACTIONS"
   wrangler kv:namespace create "RATE_LIMITS"
   
   # Preview namespaces (for PR testing)
   wrangler kv:namespace create "REACTIONS" --preview
   wrangler kv:namespace create "RATE_LIMITS" --preview
   ```

2. Update namespace IDs in `wrangler.toml`:
   - `id` = production namespace ID
   - `preview_id` = preview namespace ID

3. Deploy: `npm run deploy`

### How Preview Deployments Work
- **PRs**: Automatically get unique preview URLs using preview KV namespaces
- **Production**: Uses production KV namespaces with persistent data
- **Isolation**: Preview and production data are completely separate

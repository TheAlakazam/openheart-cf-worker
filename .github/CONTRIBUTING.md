# Contributing to OpenHeart Reaction System

Thank you for your interest in contributing! This guide will help you get started.

## Development Workflow

### 1. Fork and Clone
```bash
git clone https://github.com/your-username/openheart-cf-worker.git
cd openheart-cf-worker
npm install
```

### 2. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Development
```bash
# Run tests in watch mode
npm run test:watch

# Run development server
npm run dev

# Run linting
npm run lint

# Check TypeScript
npm run build
```

### 4. Testing Requirements
- All new code must include tests
- Maintain minimum 75% test coverage
- Tests must pass on Node.js 18 and 20
- Follow existing test patterns

### 5. Pull Request Process

**Before submitting:**
- Ensure all tests pass: `npm test`
- Check coverage: `npm run test:coverage` 
- Lint your code: `npm run lint`
- Build successfully: `npm run build`

**PR Guidelines:**
- Provide clear description of changes
- Reference any related issues
- Include test cases for new functionality
- Update documentation if needed

### 6. Automated Checks

When you open a PR, GitHub Actions will automatically:
- ✅ Run full test suite
- ✅ Check TypeScript compilation
- ✅ Validate ESLint rules
- ✅ Generate coverage report
- ✅ Test Wrangler configuration

### 7. Preview Deployment

**Automatic for all PRs:**
- Every PR automatically gets a unique preview URL
- Preview updates with each new commit
- Test your changes at the preview URL provided in PR comments

### 8. Development Process

1. **Automated Checks**: Must pass all CI checks
2. **Preview Testing**: Verify functionality using the preview URL
3. **Self-Review**: Test your changes thoroughly in the preview environment
4. **Merge**: Squash and merge to `main` for production deployment

## Branch Strategy

- `main` - Production environment (auto-deploys)
- `feature/*` - Feature branches (get preview URLs on PR)
- `hotfix/*` - Emergency fixes (direct to main with preview testing)

## Coding Standards

### TypeScript
- Strict TypeScript configuration
- No `any` types (use `unknown` if needed)
- Proper error handling with try/catch
- Type all function parameters and returns

### Testing
- Use Vitest for all tests
- Mock external dependencies
- Test both success and error scenarios
- Include edge cases and validation

### Code Style
- ESLint + Prettier configuration
- Consistent naming conventions
- Clear, descriptive variable names
- JSDoc comments for complex functions

## Project Structure

```
src/
├── index.ts              # Main Worker entry point
├── types.ts              # TypeScript type definitions
├── handlers/             # Route handlers
│   ├── getReactions.ts
│   └── postReaction.ts
├── utils/                # Utility functions
│   ├── errors.ts         # Error handling & CORS
│   ├── kv.ts             # KV storage operations
│   └── rateLimiter.ts    # Rate limiting logic
└── **/*.test.ts          # Test files
```

## Rate Limiting Implementation

When modifying rate limiting:
- Test all three tiers (cooldown, per-post, global)
- Validate time window calculations
- Ensure proper KV key naming
- Test edge cases (midnight/hour boundaries)

## Security Considerations

- Always validate and sanitize inputs
- Use proper CORS headers
- Implement secure IP extraction
- No sensitive data in logs
- Validate all environment variables

## Getting Help

- Check existing issues and PRs
- Review test files for examples
- Ask questions in PR comments
- Follow the project's coding patterns

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
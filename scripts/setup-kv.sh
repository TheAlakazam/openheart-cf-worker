#!/bin/bash

# Setup script for Cloudflare KV namespaces
# Run this after installing wrangler and logging in

echo "🚀 Setting up Cloudflare KV namespaces for OpenHeart API..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler is not installed. Please run: npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run: wrangler login"
    exit 1
fi

echo "✅ Wrangler is installed and you're logged in"
echo ""

echo "📦 Creating KV namespaces..."

# Create production namespaces
echo "Creating REACTIONS namespace..."
REACTIONS_OUTPUT=$(wrangler kv namespace create "REACTIONS")
REACTIONS_PROD=$(echo "$REACTIONS_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d '"' -f 2)
echo "Production REACTIONS namespace ID: $REACTIONS_PROD"

echo "Creating REACTIONS preview namespace..."
REACTIONS_PREVIEW_OUTPUT=$(wrangler kv namespace create "REACTIONS" --preview)
REACTIONS_PREVIEW=$(echo "$REACTIONS_PREVIEW_OUTPUT" | grep -o 'preview_id = "[^"]*"' | cut -d '"' -f 2)
echo "Preview REACTIONS namespace ID: $REACTIONS_PREVIEW"

echo "Creating RATE_LIMITS namespace..."
RATE_LIMITS_OUTPUT=$(wrangler kv namespace create "RATE_LIMITS")
RATE_LIMITS_PROD=$(echo "$RATE_LIMITS_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d '"' -f 2)
echo "Production RATE_LIMITS namespace ID: $RATE_LIMITS_PROD"

echo "Creating RATE_LIMITS preview namespace..."
RATE_LIMITS_PREVIEW_OUTPUT=$(wrangler kv namespace create "RATE_LIMITS" --preview)
RATE_LIMITS_PREVIEW=$(echo "$RATE_LIMITS_PREVIEW_OUTPUT" | grep -o 'preview_id = "[^"]*"' | cut -d '"' -f 2)
echo "Preview RATE_LIMITS namespace ID: $RATE_LIMITS_PREVIEW"

echo ""
echo "✅ All KV namespaces created successfully!"
echo ""

# Update wrangler.toml
echo "📝 Updating wrangler.toml with namespace IDs..."

# Create the new wrangler.toml content
cat > wrangler.toml << EOF
name = "openheart-reactions-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# KV namespaces - automatically configured
[[kv_namespaces]]
binding = "REACTIONS"
id = "$REACTIONS_PROD"
preview_id = "$REACTIONS_PREVIEW"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "$RATE_LIMITS_PROD"
preview_id = "$RATE_LIMITS_PREVIEW"

# Environment variables
[vars]
MAX_REACTIONS_PER_POST_PER_DAY = "3"
MAX_REACTIONS_PER_IP_PER_HOUR = "10"
REACTION_COOLDOWN_SECONDS = "0.5"
EOF

echo "✅ Updated wrangler.toml with namespace IDs"
echo ""

echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Enable deployments by uncommenting the deployment steps in:"
echo "   - .github/workflows/test.yml"
echo "   - .github/workflows/deploy.yml"
echo ""
echo "2. Add GitHub secrets:"
echo "   - CLOUDFLARE_API_TOKEN"
echo "   - CLOUDFLARE_ACCOUNT_ID"
echo ""
echo "3. Test deployment:"
echo "   npm run deploy"
echo ""
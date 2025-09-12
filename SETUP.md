# OpenHeart API Setup Guide

## Quick Manual Setup (Recommended)

Since you already have the KV namespace structure in `wrangler.toml`, here's how to create them:

### 1. Create KV Namespaces

Run these commands one by one:

```bash
# Create production REACTIONS namespace
wrangler kv namespace create "REACTIONS"

# Create preview REACTIONS namespace  
wrangler kv namespace create "REACTIONS" --preview

# Create production RATE_LIMITS namespace
wrangler kv namespace create "RATE_LIMITS"

# Create preview RATE_LIMITS namespace
wrangler kv namespace create "RATE_LIMITS" --preview
```

Each command will output something like:
```
[[kv_namespaces]]
binding = "REACTIONS"
id = "abc123def456789"
preview_id = "xyz987uvw654321"
```

### 2. Update wrangler.toml

Copy the `id` and `preview_id` values from the command outputs and paste them into your `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "REACTIONS"
id = "abc123def456789"        # ← Replace with your actual ID
preview_id = "xyz987uvw654321" # ← Replace with your actual preview ID

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "def456ghi789012"        # ← Replace with your actual ID  
preview_id = "uvw654nop321098" # ← Replace with your actual preview ID
```

### 3. Enable GitHub Actions Deployment

After updating `wrangler.toml`, uncomment these lines in:

**`.github/workflows/deploy.yml`** (lines 33-39):
```yaml
- name: Deploy to Cloudflare Workers
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: deploy
```

**`.github/workflows/test.yml`** (lines 48-88):
```yaml
- name: Validate wrangler.toml
  run: npx wrangler deploy --dry-run

- name: Deploy Preview (PRs only)
  if: github.event_name == 'pull_request'
  uses: cloudflare/wrangler-action@v3
  # ... etc
```

### 4. Add GitHub Secrets

In your GitHub repository settings → Secrets and variables → Actions, add:

- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

### 5. Test Deployment

```bash
npm run deploy
```

## Alternative: List Existing Namespaces

If you want to check what KV namespaces you already have:

```bash
wrangler kv namespace list
```

Then use existing ones if available, or create new ones as shown above.
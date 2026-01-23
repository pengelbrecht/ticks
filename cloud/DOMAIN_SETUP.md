# Ticks Cloud Domain Setup

This guide explains how to configure a custom domain (e.g., `ticks.sh`) for the Ticks Cloud Worker.

## Prerequisites

- A registered domain (e.g., `ticks.sh`)
- A Cloudflare account
- Access to the domain's DNS settings

## Setup Steps

### 1. Add Domain to Cloudflare

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click "Add a Site" and enter your domain
3. Select a plan (Free tier works for Workers)
4. Cloudflare will scan existing DNS records
5. Update your domain registrar's nameservers to Cloudflare's nameservers

### 2. Configure DNS Records

In Cloudflare DNS settings, add these records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | 192.0.2.1 | Proxied (orange cloud) |
| AAAA | @ | 100:: | Proxied (orange cloud) |
| CNAME | www | ticks.sh | Proxied (orange cloud) |

Note: The A/AAAA records use placeholder IPs since Workers handles the actual routing. The "Proxied" status is required for Workers to intercept requests.

### 3. Update wrangler.toml

In `cloud/worker/wrangler.toml`, uncomment the routes section and update with your domain:

```toml
[routes]
{ pattern = "ticks.sh/*", zone_name = "ticks.sh" }
{ pattern = "www.ticks.sh/*", zone_name = "ticks.sh" }
```

### 4. Deploy the Worker

```bash
cd cloud/worker
npm run deploy
```

### 5. Configure SSL/TLS

1. In Cloudflare Dashboard, go to SSL/TLS settings
2. Set encryption mode to "Full" or "Full (strict)"
3. Enable "Always Use HTTPS"

### 6. Verify

Test the deployment:

```bash
# Health check
curl https://ticks.sh/health

# Should return: ok
```

## Alternative: Workers Custom Domains

Cloudflare also supports "Custom Domains" directly in Workers settings:

1. Go to Workers & Pages > ticks-cloud > Settings > Triggers
2. Click "Add Custom Domain"
3. Enter `ticks.sh`
4. Cloudflare automatically configures DNS and SSL

This method is simpler but requires the domain to already be on Cloudflare.

## Current Default URL

The Go client in `internal/tickboard/cloud/client.go` uses this default:

```go
DefaultCloudURL = "wss://ticks.sh/agent"
```

Users can override this with the `TICKS_URL` environment variable or `url=` in `~/.ticksrc`.

## Troubleshooting

### "Error 1001: DNS resolution error"
- Ensure the domain has valid A/AAAA records
- Verify the domain is "Proxied" (orange cloud), not "DNS only"

### "Error 522: Connection timed out"
- Check that the Worker is deployed
- Verify routes are correctly configured

### "Error 525: SSL handshake failed"
- Set SSL/TLS mode to "Full" in Cloudflare dashboard
- Wait for SSL certificate provisioning (can take a few minutes)

# Origin TLS certificates (Cloudflare Full strict)

Place origin TLS files here on the VM. **Do not commit** `*.pem`, `*.key`, or `*.crt`.

Nginx mounts this directory at `/etc/nginx/certs` and expects:

| File on host              | Path in container              | Purpose        |
|---------------------------|--------------------------------|----------------|
| `deploy/certs/origin.pem` | `/etc/nginx/certs/origin.pem`  | Certificate    |
| `deploy/certs/origin.key` | `/etc/nginx/certs/origin.key`  | Private key    |

## Preferred: Cloudflare Origin CA

1. Cloudflare Dashboard → **SSL/TLS** → **Origin Server** → **Create certificate**.
2. Hostnames: `crime.erickochieng.co.ke` (optionally `*.erickochieng.co.ke`).
3. Validity: 15 years is fine for Origin CA.
4. Copy the certificate PEM → save as `origin.pem` in this folder.
5. Copy the private key → save as `origin.key` in this folder.
6. Restrict key permissions on the VM: `chmod 600 origin.key`.
7. Cloudflare → **SSL/TLS** → **Overview** → set mode to **Full (strict)**.

Cloudflare already trusts its own Origin CA when validating the origin, so you normally do **not** need to install the Cloudflare Origin CA root on the server for Full (strict). The root is only relevant if other clients (browsers, curl without CF) talk to the origin certificate directly.

## Alternative: Let’s Encrypt

If you prefer a public CA instead of Origin CA:

1. Issue a cert for `crime.erickochieng.co.ke` (certbot, acme.sh, etc.).
2. Point `ssl_certificate` / `ssl_certificate_key` in `deploy/nginx.conf` at those files (or symlink them as `origin.pem` / `origin.key`).
3. For HTTP-01, uncomment the `/.well-known/acme-challenge/` location on port 80 in `deploy/nginx.conf` and mount a webroot.
4. Still set Cloudflare SSL mode to **Full (strict)**.

## After placing certs

```bash
docker compose --profile production up -d --force-recreate nginx
```

Confirm nginx starts without SSL errors (`docker compose logs nginx`). Then verify in Cloudflare that SSL/TLS mode is **Full (strict)**.

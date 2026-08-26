# Deployment & Production Guide

## 1. Quick Start with Docker Compose

1. Clone the repository and configure `.env`:
   ```bash
   cp .env.example .env
   ```

2. Start the complete stack:
   ```bash
   docker compose up -d
   ```

3. Initialize the database and run migrations/seed:
   ```bash
   docker compose exec api npm --workspace=packages/database run push
   docker compose exec api npm --workspace=packages/database run seed
   ```

4. Access the services:
   - **Web Application**: `http://localhost:3000` (or `http://localhost` via Nginx reverse proxy)
   - **REST API & Swagger**: `http://localhost:4000/api/docs`
   - **Health Probes**: `http://localhost:4000/health`

---

# Security & Compliance Architecture

## 1. Multi-Tenancy Isolation
- Every database query in the repository and service layer is scoped to `organizationId`.
- JWT tokens embed `organizationId` verified on every request by `JwtAuthGuard`.

## 2. Opt-Out & Regulatory Compliance
- Every contact stores `marketingOptIn`, `optInSource`, and `optInAt` timestamp.
- Suppressed numbers in `SuppressionEntry` are filtered before every campaign launch.
- No anti-ban or evasive mass blasting automation is implemented.

---

# Troubleshooting & Operations

## 1. Common Diagnostics

### WhatsApp Session Disconnected
- Navigate to `/whatsapp`, click **Start / Pair** to regenerate QR code.
- If using Mock mode, verify `WHATSAPP_PROVIDER=mock` in `.env`.

### Campaign Queue Paused
- Check Worker service logs: `docker compose logs -f worker`
- Verify that Redis is reachable and healthy: `redis-cli ping`

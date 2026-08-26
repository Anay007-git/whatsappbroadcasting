# EventBlast — System Architecture & Design

## 1. Overview
EventBlast is a multi-tenant SaaS platform built for event marketing, personalized WhatsApp invitations, dynamic RSVP tracking, and audience management.

The platform is designed with a decoupled architecture that treats WhatsApp Gateways (OpenWA, Meta Cloud API, and local Mock simulators) as transport providers behind an abstract interface.

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Client Tier                          │
│  - Next.js 14/15 Responsive Dashboard                  │
│  - Public Mobile RSVP Landing Page (/rsvp/:token)      │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST JSON
                            ▼
┌────────────────────────────────────────────────────────┐
│                   API Gateway / Nginx                  │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              ▼                            ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│      NestJS REST API      │ │  BullMQ Worker Service   │
│  - Multi-tenant Auth & RBAC│ │  - Rate-limiting (Delay) │
│  - Audience Calculation   │ │  - Suppression Check     │
│  - Unique Token Generator │ │  - Exponential Retries   │
│  - OpenWA Webhook Ingestion│ │  - Status Synchronizer   │
└─────────────┬─────────────┘ └────────────┬─────────────┘
              │                            │
      ┌───────┴───────┬────────────────────┘
      ▼               ▼
┌───────────┐   ┌───────────┐
│PostgreSQL │   │Redis Queue│
│Prisma ORM │   │ & Caching │
└───────────┘   └───────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │  WhatsAppProvider Layer   │
        │  ┌─────────────────────┐  │
        │  │   OpenWAProvider    │  │
        │  ├─────────────────────┤  │
        │  │ MockWhatsAppProvider│  │
        │  ├─────────────────────┤  │
        │  │ MetaCloudAPIProvider │  │
        │  └─────────────────────┘  │
        └─────────────┬─────────────┘
                      │ HTTP / Webhooks
                      ▼
        ┌───────────────────────────┐
        │       OpenWA Server       │
        │ (External WhatsApp Engine)│
        └───────────────────────────┘
```

---

## 3. Core Subsystems

### 3.1 WhatsApp Provider Abstraction
To keep business logic isolated from gateway nuances, all communication passes through the `WhatsAppProvider` interface:
- `createSession(sessionId: string): Promise<WhatsAppSessionInfo>`
- `startSession(sessionId: string): Promise<void>`
- `stopSession(sessionId: string): Promise<void>`
- `getSessionStatus(sessionId: string): Promise<WhatsAppSessionInfo>`
- `getQRCode(sessionId: string): Promise<string | null>`
- `sendText(params: SendTextParams): Promise<SendMessageResult>`
- `sendMedia(params: SendMediaParams): Promise<SendMessageResult>`

### 3.2 Message Queue & Safety Throttling
- Messages are dispatched sequentially using token-bucket rate limiting (`MESSAGE_MIN_DELAY_MS` = 1,000ms).
- Operational delay ensures account stability without spam-burst flooding.
- The Worker checks campaign status (`RUNNING`, `PAUSED`, `CANCELLED`) before every dispatch to ensure **Emergency Stops** take effect immediately.

### 3.3 Cryptographic RSVP Token System
- Every guest receives a cryptographically generated, random URL-safe base64 token (16+ bytes).
- Internal database IDs are never exposed in public URLs.
- Tokens cannot be enumerated.

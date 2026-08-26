# EventBlast — WhatsApp Event Marketing SaaS Platform

Production-ready, multi-tenant SaaS platform for creating, scheduling, dispatching, and analyzing WhatsApp-based event marketing campaigns and personalized RSVP workflows with OpenWA integration.

---

## 🌟 Key Features

- **WhatsApp Gateway Layer**: Modular `WhatsAppProvider` abstraction with support for **OpenWA REST Server**, **Mock Simulator** (for local zero-dependency testing), and **Meta WhatsApp Cloud API**.
- **Contact Management & Import Wizard**: Multi-criteria directory with E.164 phone normalization, and 4-step CSV/XLSX import wizard with column auto-detection and duplicate/invalid/opt-out detection.
- **Event Hub & Check-In**: Complete event management with venue mapping, guest lists, and staff QR check-in capabilities.
- **Multi-Step Campaign Builder**: 8-step campaign wizard featuring a **Live Phone WhatsApp Mock Preview** with real-time variable substitutions (`{{firstName}}`, `{{eventName}}`, `{{venue}}`, `{{rsvpUrl}}`).
- **Cryptographic RSVP System**: Unique, unguessable, secure RSVP tokens (`/rsvp/[token]`) with one-click Google Calendar (.ics) export and attendance responses (`Going`, `Maybe`, `Declined`).
- **Rate-Limiting & Operational Safety**: Sequential message throttling with token-bucket delays, pause/resume controls, and an instantaneous **Emergency Stop**.
- **Compliance & Suppression Registry**: Full opt-in tracking (timestamp + source) and active suppression list enforcement.
- **Analytics & Conversion Funnels**: Visual delivery and conversion funnels powered by Recharts.
- **Multi-Tenancy & RBAC**: Organization boundary isolation with roles (`Owner`, `Admin`, `Manager`, `Operator`, `Viewer`) and immutable audit logging.

---

## 🏗️ Monorepo Structure

```
eventblast/
├── apps/
│   ├── web/           # Next.js 14/15 Frontend Dashboard & Public RSVP
│   ├── api/           # NestJS REST API with Prisma ORM
│   └── worker/        # BullMQ / Standalone Campaign Message Processor
├── packages/
│   ├── types/         # Shared TypeScript interfaces, DTOs & Enums
│   ├── shared/        # Normalizers, Template Parsers, Crypto Helpers
│   ├── validation/    # Zod Validation Schemas
│   ├── whatsapp/      # WhatsApp Provider Abstraction & OpenWA / Mock Implementations
│   └── database/      # Prisma Schema, Migrations & Seed Scripts
├── infrastructure/
│   ├── docker/        # Dockerfiles for Web, API, and Worker
│   └── nginx/         # Nginx Reverse Proxy Config
├── docs/              # Comprehensive Documentation
├── docker-compose.yml # Production Docker Stack
├── docker-compose.dev.yml # Local Dev Containers
└── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18
- Docker & Docker Compose (Optional for full container stack)

### 2. Installation
```bash
# Install dependencies across all monorepo workspaces
npm install
```

### 3. Generate Prisma Client & Build Shared Packages
```bash
npm run build:packages
```

### 4. Database Initialization & Seed
```bash
npm run db:push
npm run db:seed
```

### 5. Start Development Servers
```bash
# Run API, Worker, and Web concurrently
npm run dev
```

- **Frontend Dashboard**: `http://localhost:3000`
- **REST API**: `http://localhost:4000/api`
- **Swagger Documentation**: `http://localhost:4000/api/docs`
- **Health Endpoint**: `http://localhost:4000/health`

### 6. Default Demo Credentials
- **Email**: `admin@eventblast.io`
- **Password**: `AdminPassword123!`

---

## 📚 Documentation
Detailed architectural and operational documentation is available in the [`docs/`](./docs) directory:
- [Architecture & Design](./docs/architecture.md)
- [Database Schema](./docs/database.md)
- [API Reference](./docs/api.md)
- [OpenWA Integration](./docs/openwa.md)
- [Campaigns & Throttling](./docs/campaigns.md)
- [Deployment Guide](./docs/deployment.md)

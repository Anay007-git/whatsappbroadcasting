# OpenWA Integration Guide

## 1. Overview
[OpenWA](https://github.com/rmyndharis/OpenWA) is an independent WhatsApp gateway engine running as a standalone container or service.

EventBlast communicates with OpenWA purely over HTTP REST endpoints and webhooks.

---

## 2. Configuration Parameters
In `.env`:
```env
WHATSAPP_PROVIDER=openwa # Or 'mock' for local offline testing
OPENWA_BASE_URL=http://localhost:2785
OPENWA_API_KEY=your_openwa_api_secret_key
OPENWA_WEBHOOK_SECRET=your_openwa_webhook_secret_key
OPENWA_TIMEOUT_MS=15000
```

---

## 3. Session Connection Lifecycle

1. **Session Creation**:
   API calls `POST /api/sessions/create` with `{ sessionId }`.
2. **Session Start / QR Generation**:
   API calls `POST /api/:session/start-session`.
   OpenWA generates pairing QR string.
3. **Scan in WhatsApp**:
   The admin scans the QR code from WhatsApp on their mobile phone.
4. **Session Connected**:
   OpenWA emits `session.connected` webhook to `POST /api/webhooks/openwa`.
   Database marks `WhatsAppSession.status = CONNECTED`.

---

## 4. Webhook Mapping

| OpenWA Event | EventBlast Database Action |
|---|---|
| `session.connected` | `WhatsAppSession.status = CONNECTED` |
| `session.disconnected` | `WhatsAppSession.status = DISCONNECTED` |
| `message.sent` | `CampaignMessage.status = SENT`, `sentAt = now` |
| `message.delivered` | `CampaignMessage.status = DELIVERED`, `deliveredAt = now`, `EventGuest.invitationStatus = DELIVERED`, `Campaign.deliveredCount++` |
| `message.read` | `CampaignMessage.status = READ`, `readAt = now`, `EventGuest.invitationStatus = READ`, `Campaign.readCount++` |
| `message.failed` | `CampaignMessage.status = FAILED`, `failedAt = now`, `Campaign.failedCount++` |

---

## 5. Mock WhatsApp Provider (Offline Simulation)
For development without requiring a live SIM or active WhatsApp number, set:
```env
WHATSAPP_PROVIDER=mock
```
The `MockWhatsAppProvider` will:
- Generate genuine QR code data URLs for UI preview
- Simulate session pairing
- Return realistic mock provider message IDs
- Enable instant end-to-end testing of campaigns and RSVP links!

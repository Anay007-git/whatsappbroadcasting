# EventBlast REST API Documentation

Base URL: `/api`  
Interactive Swagger Docs: `/api/docs`

---

## 1. Authentication
- `POST /api/auth/login`: `{ email, password }` -> Returns `{ accessToken, user }`
- `POST /api/auth/register`: `{ organizationName, name, email, password }` -> Creates tenant and owner account
- `GET /api/auth/me`: Profile of current authenticated user

---

## 2. WhatsApp Sessions
- `GET /api/whatsapp/sessions`: List connected sessions
- `POST /api/whatsapp/sessions`: `{ displayName, provider: 'OPENWA' | 'MOCK' }`
- `POST /api/whatsapp/sessions/:id/start`: Initialize pairing / start session
- `POST /api/whatsapp/sessions/:id/stop`: Disconnect session
- `GET /api/whatsapp/sessions/:id/qr`: Fetch current QR Code data URL
- `POST /api/whatsapp/sessions/test-send`: `{ whatsappSessionId, phoneNumber, messageContent }` -> Sends test WhatsApp message

---

## 3. Contacts & Groups
- `GET /api/contacts`: List with pagination and filters (`groupId`, `search`, `optedOut`)
- `POST /api/contacts`: Create single contact with E.164 normalization
- `GET /api/contacts/:id`: Detailed contact profile with event and campaign history
- `PATCH /api/contacts/:id`: Update contact details
- `DELETE /api/contacts/:id`: Remove contact
- `GET /api/contacts/export/csv`: Download filtered contacts as CSV
- `POST /api/contacts/import/preview`: Parse CSV/XLSX and extract headers
- `POST /api/contacts/import/process`: Batch import contacts with column mapping
- `GET /api/groups`: List contact groups
- `POST /api/groups`: Create new group

---

## 4. Events & RSVPs
- `GET /api/events`: List events with RSVP counts
- `POST /api/events`: Create event
- `GET /api/events/:id`: Event details and analytics
- `GET /api/events/:id/guests`: List invited guests with invitation and RSVP status
- `POST /api/events/:id/guests`: `{ groupId }` -> Generates unique secure RSVP tokens for contacts
- `POST /api/events/:id/checkin`: `{ token }` -> Mark guest present at venue

---

## 5. Public RSVP Endpoints (Unauthenticated)
- `GET /api/rsvp/:token`: Resolves public event details, organizer info, and guest first name
- `POST /api/rsvp/:token/respond`: `{ status: 'GOING' | 'MAYBE' | 'DECLINED', guestCount, notes }`
- `GET /api/rsvp/:token/ics`: Download iCalendar `.ics` file for Google / Apple Calendar

---

## 6. Campaigns
- `GET /api/campaigns`: List campaigns
- `POST /api/campaigns`: Create campaign draft
- `GET /api/campaigns/:id/audience`: Calculate eligible audience and opt-out exclusions
- `GET /api/campaigns/:id/validate`: Check readiness before launching
- `POST /api/campaigns/:id/launch`: Enqueue messages and start delivery wave
- `POST /api/campaigns/:id/pause`: Pause running campaign
- `POST /api/campaigns/:id/resume`: Resume paused campaign
- `POST /api/campaigns/:id/emergency-stop`: Immediately stop dispatch and cancel pending queue

---

## 7. Webhooks
- `POST /api/webhooks/openwa`: Receives OpenWA gateway events (`message.sent`, `message.delivered`, `message.read`, `message.failed`, `session.connected`)

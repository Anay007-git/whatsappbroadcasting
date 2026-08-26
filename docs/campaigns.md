# Campaign Engine & Throttling Documentation

## 1. Campaign Workflow

1. **Draft Creation**: Organizer specifies target event, campaign type, and message content.
2. **Audience Filtering**:
   - Matches audience criteria (All, Group, or Event Guests).
   - Verifies `marketingOptIn == true`.
   - Filters out `optedOut == true`.
   - Filters out numbers present in `SuppressionEntry` table.
3. **Variable Resolution**:
   - Interpolates `{{firstName}}`, `{{fullName}}`, `{{company}}`, `{{eventName}}`, `{{eventDate}}`, `{{venue}}`, `{{rsvpUrl}}`, `{{mapsUrl}}`.
   - Any unresolved variable is flagged to prevent sending incomplete messages.
4. **Token Generation**:
   - Generates unique secure RSVP token for each guest: `/rsvp/[token]`.
5. **Message Enqueueing**:
   - `CampaignMessage` records created in database with unique constraint `[campaignId, contactId]` to prevent duplicate sends.
6. **Worker Dispatch**:
   - Worker picks queued messages with token-bucket delay (`MESSAGE_MIN_DELAY_MS` = 1,000ms).
   - Re-checks campaign status before every send.
7. **Emergency Stop**:
   - Instantly halts dispatch and marks remaining queued messages as cancelled/failed.

---

# RSVP System & Token Security Documentation

## 1. Security Design
- **Random Tokens**: Generated with 16 bytes of cryptographic entropy (`crypto.randomBytes`).
- **No Database ID Leakage**: URL parameters use only the unique token (`/rsvp/8Kx92LmPq...`), never exposing sequence IDs.
- **Anti-Enumeration**: Invalid or forged tokens return standard 404 without leaking whether the token or event existed.
- **Deadline Enforcement**: RSVPs submitted after `rsvpDeadline` are rejected.

## 2. Calendar Integration
- Generates compliant RFC 5545 `.ics` iCalendar files via `GET /api/rsvp/:token/ics`.
- Includes exact UTC start/end times, venue address, and Google Maps directions link for one-click import into Google Calendar, Apple Calendar, and Outlook.

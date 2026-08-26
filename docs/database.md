# Database Architecture & Schema Reference

## 1. Database Technology
- **Engine**: PostgreSQL 16
- **ORM**: Prisma ORM with type-safe schema generation and migrations

---

## 2. Entity Relational Model

### `Organization` (Tenant Boundary)
- `id` (UUID, Primary Key)
- `name` (String)
- `slug` (String, Unique)
- `logoUrl` (String, Optional)
- `timezone` (String, default: `Asia/Kolkata`)
- `createdAt`, `updatedAt`

### `User` (RBAC)
- `id` (UUID, Primary Key)
- `organizationId` (FK -> Organization)
- `name` (String)
- `email` (String, Unique)
- `passwordHash` (Bcrypt hash)
- `role` (`OWNER`, `ADMIN`, `MANAGER`, `OPERATOR`, `VIEWER`)
- `status` (`ACTIVE`, `INACTIVE`, `INVITED`)

### `WhatsAppSession` (Gateway Line)
- `id` (UUID, Primary Key)
- `organizationId` (FK -> Organization)
- `provider` (`OPENWA`, `MOCK`, `META_CLOUD`)
- `providerSessionId` (String, Unique)
- `phoneNumber` (String, E.164)
- `displayName` (String)
- `status` (`INITIALIZING`, `QR_READY`, `CONNECTED`, `DISCONNECTED`, `FAILED`)
- `qrCode` (Text, Base64 Data URL)
- `lastSeenAt` (DateTime)

### `Contact`
- `id` (UUID, Primary Key)
- `organizationId` (FK -> Organization)
- `firstName`, `lastName`, `fullName`
- `phoneNumber` (String, E.164 normalized e.g. `+919876543210`)
- `email`, `company`, `designation`
- `marketingOptIn` (Boolean, default: true)
- `optInSource` (String)
- `optInAt` (DateTime)
- `optedOut` (Boolean, default: false)
- `customFields` (JSON)
- *Unique Constraint*: `[organizationId, phoneNumber]`

### `SuppressionEntry`
- `id` (UUID, Primary Key)
- `organizationId` (FK -> Organization)
- `phoneNumber` (String, E.164)
- `reason` (String)
- `source` (String)
- *Unique Constraint*: `[organizationId, phoneNumber]`

### `Event`
- `id` (UUID, Primary Key)
- `organizationId` (FK -> Organization)
- `name`, `slug` (Unique per org)
- `description`, `bannerUrl`
- `startAt`, `endAt`, `timezone`
- `venueName`, `venueAddress`, `mapsUrl`
- `rsvpDeadline` (DateTime)
- `status` (`DRAFT`, `PUBLISHED`, `LIVE`, `COMPLETED`, `CANCELLED`)

### `EventGuest`
- `id` (UUID, Primary Key)
- `eventId` (FK -> Event)
- `contactId` (FK -> Contact)
- `invitationStatus` (`NOT_SENT`, `QUEUED`, `SENT`, `DELIVERED`, `READ`, `FAILED`)
- `rsvpStatus` (`PENDING`, `GOING`, `MAYBE`, `DECLINED`)
- `uniqueToken` (String, Unique cryptographically secure token)
- `checkedInAt` (DateTime, for onsite venue check-in)
- *Unique Constraint*: `[eventId, contactId]`

### `Campaign`
- `id` (UUID, Primary Key)
- `organizationId` (FK -> Organization)
- `eventId` (FK -> Event, Optional)
- `name`, `campaignType` (`INVITATION`, `REMINDER`, etc.)
- `status` (`DRAFT`, `SCHEDULED`, `RUNNING`, `PAUSED`, `COMPLETED`, `CANCELLED`)
- `whatsappSessionId` (FK -> WhatsAppSession)
- `messageContent`, `mediaUrl`, `mediaType`
- `totalRecipients`, `sentCount`, `deliveredCount`, `readCount`, `failedCount`, `rsvpCount`

### `CampaignMessage`
- `id` (UUID, Primary Key)
- `campaignId` (FK -> Campaign)
- `contactId` (FK -> Contact)
- `eventGuestId` (FK -> EventGuest, Optional)
- `providerMessageId` (String, for webhook matching)
- `status` (`QUEUED`, `SENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`)
- `attemptCount`, `failureReason`
- *Unique Constraint*: `[campaignId, contactId]` (Prevents duplicate sends)

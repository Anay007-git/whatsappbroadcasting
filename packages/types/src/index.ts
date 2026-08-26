// ==========================================
// EventBlast - Shared Core Types & Enums
// ==========================================

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  INVITED = 'INVITED',
}

export enum WhatsAppSessionStatus {
  INITIALIZING = 'INITIALIZING',
  QR_READY = 'QR_READY',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  FAILED = 'FAILED',
}

export enum WhatsAppProviderType {
  OPENWA = 'OPENWA',
  MOCK = 'MOCK',
  META_CLOUD = 'META_CLOUD',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum RSVPStatus {
  PENDING = 'PENDING',
  GOING = 'GOING',
  MAYBE = 'MAYBE',
  DECLINED = 'DECLINED',
}

export enum InvitationStatus {
  NOT_SENT = 'NOT_SENT',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export enum CampaignType {
  INVITATION = 'INVITATION',
  REMINDER = 'REMINDER',
  CONFIRMATION = 'CONFIRMATION',
  FOLLOW_UP = 'FOLLOW_UP',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  CUSTOM = 'CUSTOM',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum CampaignMessageStatus {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
}

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  USER_INVITE = 'USER_INVITE',
  USER_UPDATE = 'USER_UPDATE',
  CONTACT_CREATE = 'CONTACT_CREATE',
  CONTACT_UPDATE = 'CONTACT_UPDATE',
  CONTACT_DELETE = 'CONTACT_DELETE',
  CONTACT_IMPORT = 'CONTACT_IMPORT',
  CONTACT_EXPORT = 'CONTACT_EXPORT',
  GROUP_CREATE = 'GROUP_CREATE',
  GROUP_UPDATE = 'GROUP_UPDATE',
  GROUP_DELETE = 'GROUP_DELETE',
  SUPPRESSION_ADD = 'SUPPRESSION_ADD',
  SUPPRESSION_REMOVE = 'SUPPRESSION_REMOVE',
  EVENT_CREATE = 'EVENT_CREATE',
  EVENT_UPDATE = 'EVENT_UPDATE',
  EVENT_DELETE = 'EVENT_DELETE',
  CAMPAIGN_CREATE = 'CAMPAIGN_CREATE',
  CAMPAIGN_UPDATE = 'CAMPAIGN_UPDATE',
  CAMPAIGN_LAUNCH = 'CAMPAIGN_LAUNCH',
  CAMPAIGN_PAUSE = 'CAMPAIGN_PAUSE',
  CAMPAIGN_RESUME = 'CAMPAIGN_RESUME',
  CAMPAIGN_CANCEL = 'CAMPAIGN_CANCEL',
  CAMPAIGN_EMERGENCY_STOP = 'CAMPAIGN_EMERGENCY_STOP',
  CAMPAIGN_TEST_SEND = 'CAMPAIGN_TEST_SEND',
  WHATSAPP_CONNECT = 'WHATSAPP_CONNECT',
  WHATSAPP_DISCONNECT = 'WHATSAPP_DISCONNECT',
  SETTINGS_CHANGE = 'SETTINGS_CHANGE',
}

// Data Transfer Interfaces

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  timezone: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserDTO {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WhatsAppSessionDTO {
  id: string;
  organizationId: string;
  provider: WhatsAppProviderType;
  providerSessionId: string;
  phoneNumber?: string | null;
  displayName: string;
  status: WhatsAppSessionStatus;
  qrCode?: string | null;
  lastSeenAt?: Date | string | null;
  lastSuccessfulMessageAt?: Date | string | null;
  failureCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ContactDTO {
  id: string;
  organizationId: string;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  phoneNumber: string; // E.164
  email?: string | null;
  company?: string | null;
  designation?: string | null;
  source?: string | null;
  marketingOptIn: boolean;
  optInSource?: string | null;
  optInAt?: Date | string | null;
  optedOut: boolean;
  optedOutAt?: Date | string | null;
  customFields?: Record<string, any>;
  groups?: ContactGroupDTO[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ContactGroupDTO {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  contactCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SuppressionEntryDTO {
  id: string;
  organizationId: string;
  phoneNumber: string;
  reason: string;
  source: string;
  createdAt: Date | string;
}

export interface EventDTO {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  bannerUrl?: string | null;
  startAt: Date | string;
  endAt: Date | string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
  rsvpEnabled: boolean;
  rsvpDeadline?: Date | string | null;
  status: EventStatus;
  guestCount?: number;
  confirmedCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EventGuestDTO {
  id: string;
  eventId: string;
  contactId: string;
  contact?: ContactDTO;
  invitationStatus: InvitationStatus;
  rsvpStatus: RSVPStatus;
  uniqueToken: string;
  invitedAt?: Date | string | null;
  respondedAt?: Date | string | null;
  checkedInAt?: Date | string | null;
  customData?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TemplateDTO {
  id: string;
  organizationId: string;
  name: string;
  content: string;
  category: string;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  variables?: string[];
  isArchived: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignDTO {
  id: string;
  organizationId: string;
  eventId?: string | null;
  event?: EventDTO | null;
  name: string;
  description?: string | null;
  campaignType: CampaignType;
  status: CampaignStatus;
  whatsappSessionId: string;
  whatsappSession?: WhatsAppSessionDTO;
  templateId?: string | null;
  template?: TemplateDTO | null;
  messageContent?: string;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  targetAudience?: {
    type: 'ALL' | 'GROUP' | 'EVENT_GUESTS' | 'CUSTOM';
    groupIds?: string[];
    rsvpFilter?: RSVPStatus[];
    contactIds?: string[];
  };
  scheduledAt?: Date | string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdBy: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  rsvpCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignMessageDTO {
  id: string;
  campaignId: string;
  contactId: string;
  contact?: ContactDTO;
  eventGuestId?: string | null;
  sessionId: string;
  renderedMessage: string;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  providerMessageId?: string | null;
  status: CampaignMessageStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: Date | string | null;
  sentAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  readAt?: Date | string | null;
  failedAt?: Date | string | null;
  failureReason?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuditLogDTO {
  id: string;
  organizationId: string;
  userId?: string | null;
  user?: { name: string; email: string } | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
}

// WhatsApp Provider Interface Definitions

export interface WhatsAppSessionInfo {
  sessionId: string;
  status: WhatsAppSessionStatus;
  phoneNumber?: string;
  qrCode?: string;
  battery?: number;
  plugged?: boolean;
}

export interface SendTextParams {
  sessionId: string;
  to: string; // E.164 or JID
  text: string;
  metadata?: Record<string, any>;
}

export interface SendMediaParams {
  sessionId: string;
  to: string;
  mediaUrl: string;
  mediaType: MediaType;
  caption?: string;
  filename?: string;
  metadata?: Record<string, any>;
}

export interface SendMessageResult {
  success: boolean;
  providerMessageId?: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  error?: string;
  timestamp: Date;
}

export interface WhatsAppProvider {
  createSession(sessionId: string): Promise<WhatsAppSessionInfo>;
  startSession(sessionId: string): Promise<void>;
  stopSession(sessionId: string): Promise<void>;
  getSessionStatus(sessionId: string): Promise<WhatsAppSessionInfo>;
  getQRCode(sessionId: string): Promise<string | null>;
  sendText(params: SendTextParams): Promise<SendMessageResult>;
  sendMedia(params: SendMediaParams): Promise<SendMessageResult>;
}

// Webhook Types
export interface OpenWAWebhookPayload {
  event: 'message.sent' | 'message.delivered' | 'message.read' | 'message.failed' | 'session.connected' | 'session.disconnected' | 'qr.received';
  sessionId: string;
  timestamp: number | string;
  data: {
    messageId?: string;
    to?: string;
    from?: string;
    status?: string;
    reason?: string;
    qrCode?: string;
    phoneNumber?: string;
  };
}

// API Standard Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

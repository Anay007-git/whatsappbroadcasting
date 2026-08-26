import { z } from 'zod';
import {
  UserRole,
  UserStatus,
  EventStatus,
  RSVPStatus,
  CampaignType,
  MediaType,
  WhatsAppProviderType,
} from '@eventblast/types';
import { normalizePhoneNumber, isValidPhoneNumber } from '@eventblast/shared';

// Custom validator for E.164 phone numbers
export const PhoneNumberSchema = z
  .string()
  .min(8, 'Phone number must be at least 8 characters')
  .transform((val) => normalizePhoneNumber(val))
  .refine((val) => isValidPhoneNumber(val), {
    message: 'Invalid phone number. Must be a valid international format (e.g. +919876543210)',
  });

// Auth Schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  timezone: z.string().default('Asia/Kolkata'),
});

export const InviteUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(UserRole).default(UserRole.OPERATOR),
});

// Organization Schemas
export const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().url().nullable().optional(),
});

// Contact Schemas
export const CreateContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional().nullable(),
  phoneNumber: PhoneNumberSchema,
  email: z.string().email().optional().nullable().or(z.literal('')),
  company: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  source: z.string().default('MANUAL'),
  marketingOptIn: z.boolean().default(true),
  optInSource: z.string().default('DIRECT_ENTRY'),
  groupIds: z.array(z.string()).optional().default([]),
  customFields: z.record(z.any()).optional().default({}),
});

export const UpdateContactSchema = CreateContactSchema.partial().extend({
  optedOut: z.boolean().optional(),
});

export const ImportContactsMappingSchema = z.object({
  columnMapping: z.object({
    fullName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z.string(),
    email: z.string().optional(),
    company: z.string().optional(),
    designation: z.string().optional(),
    customFields: z.record(z.string()).optional(),
  }),
  defaultGroupId: z.string().optional(),
  marketingOptIn: z.boolean().default(true),
  optInSource: z.string().default('CSV_IMPORT'),
});

export const CreateSuppressionSchema = z.object({
  phoneNumber: PhoneNumberSchema,
  reason: z.string().min(2, 'Reason is required'),
  source: z.string().default('MANUAL'),
});

// Group Schemas
export const CreateGroupSchema = z.object({
  name: z.string().min(2, 'Group name is required'),
  description: z.string().optional().nullable(),
});

export const UpdateGroupSchema = CreateGroupSchema.partial();

// Event Schemas
export const CreateEventSchema = z.object({
  name: z.string().min(2, 'Event name is required'),
  description: z.string().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable().or(z.literal('')),
  startAt: z.string().or(z.date()),
  endAt: z.string().or(z.date()),
  timezone: z.string().default('Asia/Kolkata'),
  venueName: z.string().min(2, 'Venue name is required'),
  venueAddress: z.string().min(2, 'Venue address is required'),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  mapsUrl: z.string().url().optional().nullable().or(z.literal('')),
  rsvpEnabled: z.boolean().default(true),
  rsvpDeadline: z.string().or(z.date()).optional().nullable(),
  status: z.nativeEnum(EventStatus).default(EventStatus.PUBLISHED),
});

export const UpdateEventSchema = CreateEventSchema.partial();

export const AddEventGuestSchema = z.object({
  contactId: z.string(),
  customData: z.record(z.any()).optional().default({}),
});

// Template Schemas
export const CreateTemplateSchema = z.object({
  name: z.string().min(2, 'Template name is required'),
  content: z.string().min(5, 'Template message content is required'),
  category: z.string().default('MARKETING'),
  mediaUrl: z.string().url().optional().nullable().or(z.literal('')),
  mediaType: z.nativeEnum(MediaType).optional().nullable(),
});

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

// Campaign Schemas
export const CreateCampaignSchema = z.object({
  eventId: z.string().optional().nullable(),
  name: z.string().min(2, 'Campaign name is required'),
  description: z.string().optional().nullable(),
  campaignType: z.nativeEnum(CampaignType).default(CampaignType.INVITATION),
  whatsappSessionId: z.string().min(1, 'WhatsApp session is required'),
  templateId: z.string().optional().nullable(),
  messageContent: z.string().min(1, 'Message content is required'),
  mediaUrl: z.string().url().optional().nullable().or(z.literal('')),
  mediaType: z.nativeEnum(MediaType).optional().nullable(),
  targetAudience: z.object({
    type: z.enum(['ALL', 'GROUP', 'EVENT_GUESTS', 'CUSTOM']),
    groupIds: z.array(z.string()).optional(),
    rsvpFilter: z.array(z.nativeEnum(RSVPStatus)).optional(),
    contactIds: z.array(z.string()).optional(),
  }),
  scheduledAt: z.string().or(z.date()).optional().nullable(),
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial();

export const LaunchCampaignSchema = z.object({
  campaignId: z.string(),
});

export const TestMessageSchema = z.object({
  campaignId: z.string().optional(),
  whatsappSessionId: z.string(),
  phoneNumber: PhoneNumberSchema,
  messageContent: z.string().min(1),
  mediaUrl: z.string().url().optional().nullable(),
  mediaType: z.nativeEnum(MediaType).optional().nullable(),
  sampleVariables: z.record(z.any()).optional(),
});

// RSVP Public Schemas
export const RespondRSVPSchema = z.object({
  status: z.nativeEnum(RSVPStatus),
  notes: z.string().optional().nullable(),
  guestCount: z.number().int().min(1).max(10).default(1),
});

// WhatsApp Session Schemas
export const CreateSessionSchema = z.object({
  displayName: z.string().min(2, 'Session display name is required'),
  provider: z.nativeEnum(WhatsAppProviderType).default(WhatsAppProviderType.MOCK),
});

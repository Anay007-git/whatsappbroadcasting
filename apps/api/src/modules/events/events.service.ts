import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, EventStatus, RSVPStatus, InvitationStatus } from '@prisma/client';
import { generateSecureToken } from '@eventblast/shared';
import { CreateEventSchema, UpdateEventSchema } from '@eventblast/validation';
import { z } from 'zod';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async list(organizationId: string, search?: string, status?: EventStatus) {
    const where: any = { organizationId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { venueName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: {
        guests: {
          select: { rsvpStatus: true, invitationStatus: true, checkedInAt: true },
        },
        _count: {
          select: { campaigns: true },
        },
      },
    });

    return events.map((e) => {
      const totalGuests = e.guests.length;
      const confirmed = e.guests.filter((g) => g.rsvpStatus === RSVPStatus.GOING).length;
      const maybe = e.guests.filter((g) => g.rsvpStatus === RSVPStatus.MAYBE).length;
      const declined = e.guests.filter((g) => g.rsvpStatus === RSVPStatus.DECLINED).length;
      const pending = e.guests.filter((g) => g.rsvpStatus === RSVPStatus.PENDING).length;
      const checkedIn = e.guests.filter((g) => g.checkedInAt !== null).length;

      return {
        id: e.id,
        name: e.name,
        slug: e.slug,
        description: e.description,
        bannerUrl: e.bannerUrl,
        startAt: e.startAt,
        endAt: e.endAt,
        timezone: e.timezone,
        venueName: e.venueName,
        venueAddress: e.venueAddress,
        latitude: e.latitude,
        longitude: e.longitude,
        mapsUrl: e.mapsUrl,
        rsvpEnabled: e.rsvpEnabled,
        rsvpDeadline: e.rsvpDeadline,
        status: e.status,
        stats: {
          totalGuests,
          confirmed,
          maybe,
          declined,
          pending,
          checkedIn,
          campaignsCount: e._count.campaigns,
        },
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      };
    });
  }

  async getById(organizationId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, organizationId },
      include: {
        guests: {
          select: { rsvpStatus: true, invitationStatus: true, checkedInAt: true },
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            campaignType: true,
            status: true,
            sentCount: true,
            deliveredCount: true,
            readCount: true,
            rsvpCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const totalGuests = event.guests.length;
    const confirmed = event.guests.filter((g) => g.rsvpStatus === RSVPStatus.GOING).length;
    const maybe = event.guests.filter((g) => g.rsvpStatus === RSVPStatus.MAYBE).length;
    const declined = event.guests.filter((g) => g.rsvpStatus === RSVPStatus.DECLINED).length;
    const pending = event.guests.filter((g) => g.rsvpStatus === RSVPStatus.PENDING).length;
    const checkedIn = event.guests.filter((g) => g.checkedInAt !== null).length;

    return {
      ...event,
      stats: {
        totalGuests,
        confirmed,
        maybe,
        declined,
        pending,
        checkedIn,
        rsvpRate: totalGuests > 0 ? Math.round(((confirmed + maybe + declined) / totalGuests) * 100) : 0,
        attendanceRate: confirmed > 0 ? Math.round((checkedIn / confirmed) * 100) : 0,
      },
    };
  }

  async create(organizationId: string, userId: string, payload: z.infer<typeof CreateEventSchema>) {
    const slugBase = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || `event-${Date.now()}`;
    const slug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

    const event = await this.prisma.event.create({
      data: {
        organizationId,
        name: payload.name,
        slug,
        description: payload.description,
        bannerUrl: payload.bannerUrl || null,
        startAt: new Date(payload.startAt),
        endAt: new Date(payload.endAt),
        timezone: payload.timezone || 'Asia/Kolkata',
        venueName: payload.venueName,
        venueAddress: payload.venueAddress,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        mapsUrl: payload.mapsUrl || null,
        rsvpEnabled: payload.rsvpEnabled ?? true,
        rsvpDeadline: payload.rsvpDeadline ? new Date(payload.rsvpDeadline) : null,
        status: payload.status || EventStatus.PUBLISHED,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.EVENT_CREATE,
      resourceType: 'Event',
      resourceId: event.id,
      metadata: { name: event.name, slug: event.slug },
    });

    return event;
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    payload: z.infer<typeof UpdateEventSchema>,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id, organizationId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        name: payload.name !== undefined ? payload.name : event.name,
        description: payload.description !== undefined ? payload.description : event.description,
        bannerUrl: payload.bannerUrl !== undefined ? payload.bannerUrl : event.bannerUrl,
        startAt: payload.startAt ? new Date(payload.startAt) : event.startAt,
        endAt: payload.endAt ? new Date(payload.endAt) : event.endAt,
        timezone: payload.timezone || event.timezone,
        venueName: payload.venueName || event.venueName,
        venueAddress: payload.venueAddress || event.venueAddress,
        latitude: payload.latitude !== undefined ? payload.latitude : event.latitude,
        longitude: payload.longitude !== undefined ? payload.longitude : event.longitude,
        mapsUrl: payload.mapsUrl !== undefined ? payload.mapsUrl : event.mapsUrl,
        rsvpEnabled: payload.rsvpEnabled !== undefined ? payload.rsvpEnabled : event.rsvpEnabled,
        rsvpDeadline: payload.rsvpDeadline ? new Date(payload.rsvpDeadline) : event.rsvpDeadline,
        status: payload.status || event.status,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.EVENT_UPDATE,
      resourceType: 'Event',
      resourceId: id,
      metadata: payload,
    });

    return updated;
  }

  async delete(organizationId: string, userId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, organizationId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.prisma.event.delete({ where: { id } });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.EVENT_DELETE,
      resourceType: 'Event',
      resourceId: id,
      metadata: { name: event.name },
    });

    return { deleted: true, id };
  }

  /**
   * List guests for an event with search and RSVP filter
   */
  async listGuests(
    organizationId: string,
    eventId: string,
    page = 1,
    limit = 50,
    search?: string,
    rsvpStatus?: RSVPStatus,
    invitationStatus?: InvitationStatus,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const skip = (page - 1) * limit;
    const where: any = { eventId };

    if (rsvpStatus) where.rsvpStatus = rsvpStatus;
    if (invitationStatus) where.invitationStatus = invitationStatus;

    if (search) {
      where.contact = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } },
          { company: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, guests] = await Promise.all([
      this.prisma.eventGuest.count({ where }),
      this.prisma.eventGuest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: {
            select: {
              id: true,
              fullName: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
              company: true,
              designation: true,
            },
          },
        },
      }),
    ]);

    return {
      items: guests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add contacts to an event's guest list and generate secure unique RSVP tokens.
   */
  async addGuests(
    organizationId: string,
    eventId: string,
    contactIds?: string[],
    groupId?: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    let targetContactIds: string[] = [];

    if (contactIds && contactIds.length > 0) {
      targetContactIds = contactIds;
    } else if (groupId) {
      const groupMembers = await this.prisma.contactGroupMember.findMany({
        where: { groupId },
        select: { contactId: true },
      });
      targetContactIds = groupMembers.map((gm) => gm.contactId);
    } else {
      // All contacts in organization
      const allContacts = await this.prisma.contact.findMany({
        where: { organizationId, optedOut: false },
        select: { id: true },
      });
      targetContactIds = allContacts.map((c) => c.id);
    }

    // Fetch existing guests to avoid duplicate tokens
    const existingGuests = await this.prisma.eventGuest.findMany({
      where: { eventId },
      select: { contactId: true },
    });
    const existingSet = new Set(existingGuests.map((g) => g.contactId));

    const newContactIds = targetContactIds.filter((cid) => !existingSet.has(cid));

    const guestRecords = newContactIds.map((cid) => ({
      eventId,
      contactId: cid,
      uniqueToken: generateSecureToken(12),
      invitationStatus: InvitationStatus.NOT_SENT,
      rsvpStatus: RSVPStatus.PENDING,
    }));

    if (guestRecords.length > 0) {
      await this.prisma.eventGuest.createMany({
        data: guestRecords,
        skipDuplicates: true,
      });
    }

    return {
      addedCount: guestRecords.length,
      skippedCount: targetContactIds.length - guestRecords.length,
      totalGuests: existingGuests.length + guestRecords.length,
    };
  }

  /**
   * Staff Check-in: validates guest token and records check-in timestamp
   */
  async checkInGuest(organizationId: string, eventId: string, tokenOrGuestId: string) {
    const guest = await this.prisma.eventGuest.findFirst({
      where: {
        eventId,
        event: { organizationId },
        OR: [{ id: tokenOrGuestId }, { uniqueToken: tokenOrGuestId }],
      },
      include: {
        contact: true,
        event: true,
      },
    });

    if (!guest) {
      throw new NotFoundException('Guest invitation record not found');
    }

    const updated = await this.prisma.eventGuest.update({
      where: { id: guest.id },
      data: {
        checkedInAt: new Date(),
        rsvpStatus: RSVPStatus.GOING, // automatically confirm attendance if present
      },
    });

    return {
      checkedIn: true,
      guest: {
        id: updated.id,
        fullName: guest.contact.fullName,
        company: guest.contact.company,
        phoneNumber: guest.contact.phoneNumber,
        checkedInAt: updated.checkedInAt,
      },
    };
  }
}

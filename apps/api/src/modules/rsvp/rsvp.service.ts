import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RSVPStatus } from '@prisma/client';
import * as ics from 'ics';
import { RespondRSVPSchema } from '@eventblast/validation';
import { z } from 'zod';

@Injectable()
export class RsvpService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resolves public RSVP landing page data without exposing sensitive IDs
   */
  async getPublicRsvp(token: string) {
    if (!token || token.length < 8) {
      throw new NotFoundException('Invalid or expired RSVP invitation link');
    }

    const guest = await this.prisma.eventGuest.findUnique({
      where: { uniqueToken: token },
      include: {
        event: {
          include: {
            organization: {
              select: { name: true, logoUrl: true },
            },
          },
        },
        contact: {
          select: {
            firstName: true,
            lastName: true,
            fullName: true,
            company: true,
            designation: true,
          },
        },
      },
    });

    if (!guest) {
      throw new NotFoundException('RSVP invitation not found or has been revoked');
    }

    const event = guest.event;

    // Check RSVP deadline
    const isPastDeadline = event.rsvpDeadline ? new Date() > new Date(event.rsvpDeadline) : false;

    return {
      event: {
        name: event.name,
        slug: event.slug,
        description: event.description,
        bannerUrl: event.bannerUrl,
        startAt: event.startAt,
        endAt: event.endAt,
        timezone: event.timezone,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        latitude: event.latitude,
        longitude: event.longitude,
        mapsUrl: event.mapsUrl,
        rsvpDeadline: event.rsvpDeadline,
        isPastDeadline,
        organizer: event.organization.name,
        organizerLogo: event.organization.logoUrl,
      },
      guest: {
        firstName: guest.contact.firstName,
        fullName: guest.contact.fullName,
        company: guest.contact.company,
        designation: guest.contact.designation,
      },
      rsvp: {
        status: guest.rsvpStatus,
        guestCount: guest.guestCount,
        notes: guest.notes,
        respondedAt: guest.respondedAt,
      },
    };
  }

  /**
   * Records attendee response
   */
  async submitRsvp(token: string, payload: z.infer<typeof RespondRSVPSchema>) {
    const guest = await this.prisma.eventGuest.findUnique({
      where: { uniqueToken: token },
      include: { event: true },
    });

    if (!guest) {
      throw new NotFoundException('RSVP invitation not found');
    }

    if (guest.event.rsvpDeadline && new Date() > new Date(guest.event.rsvpDeadline)) {
      throw new BadRequestException('The RSVP deadline for this event has passed');
    }

    const updated = await this.prisma.eventGuest.update({
      where: { id: guest.id },
      data: {
        rsvpStatus: payload.status,
        notes: payload.notes || null,
        guestCount: payload.guestCount || 1,
        respondedAt: new Date(),
      },
      include: {
        event: true,
        contact: true,
      },
    });

    // Update campaign RSVP counter if associated with a campaign
    const lastCampaignMessage = await this.prisma.campaignMessage.findFirst({
      where: { eventGuestId: guest.id },
      orderBy: { createdAt: 'desc' },
    });

    if (lastCampaignMessage) {
      await this.prisma.campaign.update({
        where: { id: lastCampaignMessage.campaignId },
        data: { rsvpCount: { increment: 1 } },
      });
    }

    return {
      success: true,
      status: updated.rsvpStatus,
      guestCount: updated.guestCount,
      respondedAt: updated.respondedAt,
      eventName: updated.event.name,
      guestName: updated.contact.fullName,
    };
  }

  /**
   * Generates downloadable iCalendar (.ics) file
   */
  async generateIcs(token: string): Promise<string> {
    const guest = await this.prisma.eventGuest.findUnique({
      where: { uniqueToken: token },
      include: { event: { include: { organization: true } } },
    });

    if (!guest) {
      throw new NotFoundException('Event not found');
    }

    const event = guest.event;
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);

    const eventAttributes: ics.EventAttributes = {
      start: [
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate(),
        start.getHours(),
        start.getMinutes(),
      ],
      end: [
        end.getFullYear(),
        end.getMonth() + 1,
        end.getDate(),
        end.getHours(),
        end.getMinutes(),
      ],
      title: event.name,
      description: `${event.description || ''}\n\nVenue: ${event.venueName}, ${event.venueAddress}`,
      location: `${event.venueName}, ${event.venueAddress}`,
      url: event.mapsUrl || undefined,
      organizer: { name: event.organization.name },
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
    };

    return new Promise((resolve, reject) => {
      ics.createEvent(eventAttributes, (error, value) => {
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      });
    });
  }
}

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateEventSchema, UpdateEventSchema } from '@eventblast/validation';
import { EventStatus, RSVPStatus, InvitationStatus } from '@prisma/client';
import { z } from 'zod';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List events with RSVP and guest metrics' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('status') status?: EventStatus,
  ) {
    return this.eventsService.list(user.organizationId, search, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event details by ID' })
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.getById(user.organizationId, id);
  }

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(CreateEventSchema))
  @ApiOperation({ summary: 'Create a new event' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof CreateEventSchema>,
  ) {
    return this.eventsService.create(user.organizationId, user.userId, body);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(UpdateEventSchema))
  @ApiOperation({ summary: 'Update an event' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: z.infer<typeof UpdateEventSchema>,
  ) {
    return this.eventsService.update(user.organizationId, user.userId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete an event' })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.delete(user.organizationId, user.userId, id);
  }

  @Get(':id/guests')
  @ApiOperation({ summary: 'List guests invited to this event' })
  async listGuests(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') eventId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('rsvpStatus') rsvpStatus?: RSVPStatus,
    @Query('invitationStatus') invitationStatus?: InvitationStatus,
  ) {
    return this.eventsService.listGuests(
      user.organizationId,
      eventId,
      parseInt(page || '1', 10),
      parseInt(limit || '50', 10),
      search,
      rsvpStatus,
      invitationStatus,
    );
  }

  @Post(':id/guests')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Add contacts/groups to event guest list with secure tokens' })
  async addGuests(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') eventId: string,
    @Body('contactIds') contactIds?: string[],
    @Body('groupId') groupId?: string,
  ) {
    return this.eventsService.addGuests(user.organizationId, eventId, contactIds, groupId);
  }

  @Post(':id/checkin')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Check in guest by RSVP token or guest ID' })
  async checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') eventId: string,
    @Body('token') token: string,
  ) {
    return this.eventsService.checkInGuest(user.organizationId, eventId, token);
  }
}

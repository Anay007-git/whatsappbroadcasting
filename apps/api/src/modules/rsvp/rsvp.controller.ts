import { Controller, Get, Post, Body, Param, Res, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RsvpService } from './rsvp.service';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RespondRSVPSchema } from '@eventblast/validation';
import { Response } from 'express';
import { z } from 'zod';

@ApiTags('Public RSVP')
@Controller('rsvp')
export class RsvpController {
  constructor(private rsvpService: RsvpService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Get public event and guest info by unique RSVP token' })
  async getPublicRsvp(@Param('token') token: string) {
    return this.rsvpService.getPublicRsvp(token);
  }

  @Public()
  @Post(':token/respond')
  @UsePipes(new ZodValidationPipe(RespondRSVPSchema))
  @ApiOperation({ summary: 'Submit RSVP response (Going, Maybe, Declined)' })
  async submitRsvp(
    @Param('token') token: string,
    @Body() body: z.infer<typeof RespondRSVPSchema>,
  ) {
    return this.rsvpService.submitRsvp(token, body);
  }

  @Public()
  @Get(':token/ics')
  @ApiOperation({ summary: 'Download iCalendar (.ics) invite file' })
  async downloadIcs(@Param('token') token: string, @Res() res: Response) {
    const icsContent = await this.rsvpService.generateIcs(token);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-invitation-${token.slice(0, 6)}.ics"`);
    return res.send(icsContent);
  }
}

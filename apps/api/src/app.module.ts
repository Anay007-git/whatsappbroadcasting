import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './modules/prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ContactGroupsModule } from './modules/contact-groups/contact-groups.module';
import { ImportsModule } from './modules/imports/imports.module';
import { SuppressionsModule } from './modules/suppressions/suppressions.module';
import { EventsModule } from './modules/events/events.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { MessagesModule } from './modules/messages/messages.module';
import { RsvpModule } from './modules/rsvp/rsvp.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AutomationModule } from './modules/automation/automation.module';
import { MediaModule } from './modules/media/media.module';
import { HealthModule } from './modules/health/health.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    ContactsModule,
    ContactGroupsModule,
    ImportsModule,
    SuppressionsModule,
    EventsModule,
    TemplatesModule,
    CampaignsModule,
    MessagesModule,
    RsvpModule,
    WhatsAppModule,
    WebhooksModule,
    AnalyticsModule,
    AutomationModule,
    MediaModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}

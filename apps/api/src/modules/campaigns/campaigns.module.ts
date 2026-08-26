import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SuppressionsModule } from '../suppressions/suppressions.module';

@Module({
  imports: [WhatsAppModule, SuppressionsModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}

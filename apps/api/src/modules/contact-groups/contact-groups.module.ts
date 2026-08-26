import { Module } from '@nestjs/common';
import { ContactGroupsService } from './contact-groups.service';
import { ContactGroupsController } from './contact-groups.controller';

@Module({
  controllers: [ContactGroupsController],
  providers: [ContactGroupsService],
  exports: [ContactGroupsService],
})
export class ContactGroupsModule {}

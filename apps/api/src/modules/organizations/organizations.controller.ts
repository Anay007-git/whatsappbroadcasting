import { Controller, Get, Patch, Body, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UpdateOrganizationSchema } from '@eventblast/validation';
import { z } from 'zod';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current organization details and stats' })
  async getMyOrganization(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getOrganization(user.organizationId);
  }

  @Patch('me')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(UpdateOrganizationSchema))
  @ApiOperation({ summary: 'Update organization settings' })
  async updateMyOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof UpdateOrganizationSchema>,
  ) {
    return this.organizationsService.updateOrganization(user.organizationId, user.userId, body);
  }
}

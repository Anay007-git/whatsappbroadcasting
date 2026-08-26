import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';

@ApiTags('Contact Imports')
@ApiBearerAuth()
@Controller('contacts/import')
export class ImportsController {
  constructor(private importsService: ImportsService) {}

  @Post('preview')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload CSV/XLSX file to preview columns and sample rows' })
  async previewFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Please upload a valid CSV or Excel file');
    }
    const result = this.importsService.parseFile(file);
    return {
      totalRows: result.totalRows,
      headers: result.headers,
      suggestedMapping: result.suggestedMapping,
      previewRows: result.previewRows,
    };
  }

  @Post('process')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Execute column-mapped contact import' })
  async processImport(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('options') optionsRaw: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    let options;
    try {
      options = typeof optionsRaw === 'string' ? JSON.parse(optionsRaw) : optionsRaw;
    } catch {
      throw new BadRequestException('Invalid options JSON format');
    }

    return this.importsService.processImport(user.organizationId, user.userId, file, options);
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health Probes')
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'General health check' })
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async getReadiness() {
    return this.healthService.checkHealth();
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  async getLiveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }
}

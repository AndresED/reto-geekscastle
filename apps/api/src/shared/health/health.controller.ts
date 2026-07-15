import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness', description: 'Process is up.' })
  @ApiOkResponse({ description: 'Healthy', type: HealthResponseDto })
  check(): HealthResponseDto {
    return { status: 'ok' };
  }
}

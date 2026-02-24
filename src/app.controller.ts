import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'API is running successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lumi Energy Bills API is running!' },
        version: { type: 'string', example: '1.0.0' },
        timestamp: { type: 'string', example: '2024-12-19T10:30:00.000Z' }
      }
    }
  })
  getHello() {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health status check' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        uptime: { type: 'number', example: 12345 },
        timestamp: { type: 'string', example: '2024-12-19T10:30:00.000Z' }
      }
    }
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

// Render polls /health frequently for its own health checks; throttling it risks
// Render marking a healthy deployment as down. Exempt both routes entirely.
@SkipThrottle()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('debug-sentry')
  debugSentry() {
    throw new Error('My first backend Sentry error!');
  }
}


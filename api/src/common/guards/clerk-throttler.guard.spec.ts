import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { ClerkThrottlerGuard } from './clerk-throttler.guard';
import { AppController } from '../../app.controller';
import { AppService } from '../../app.service';

// getTracker is protected; expose it for direct unit assertions.
type TrackerFn = (req: Record<string, any>) => Promise<string>;

function buildGuard(): ClerkThrottlerGuard {
  // getTracker only reads its request argument, so the constructor collaborators
  // (options / storage / reflector) can be minimal stubs.
  return new ClerkThrottlerGuard(
    { throttlers: [] } as any,
    {} as any,
    {} as any,
  );
}

function bearerFor(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
    'base64url',
  );
  const payload = Buffer.from(JSON.stringify({ sub })).toString('base64url');
  return `Bearer ${header}.${payload}.signature`;
}

describe('ClerkThrottlerGuard', () => {
  describe('getTracker', () => {
    let getTracker: TrackerFn;

    beforeEach(() => {
      const guard = buildGuard();
      getTracker = (req) => (guard as any).getTracker(req);
    });

    it('keys authenticated requests by clerkId when req.user is present', async () => {
      const tracker = await getTracker({
        user: { clerkId: 'user_123' },
        headers: {},
        ip: '1.2.3.4',
      });

      expect(tracker).toBe('user_123');
    });

    it('decodes clerkId from the Bearer JWT sub when req.user is absent', async () => {
      const tracker = await getTracker({
        headers: { authorization: bearerFor('user_abc') },
        ip: '1.2.3.4',
      });

      expect(tracker).toBe('user_abc');
    });

    it('falls back to req.ip for public requests with no token', async () => {
      const tracker = await getTracker({ headers: {}, ip: '9.9.9.9' });

      expect(tracker).toBe('9.9.9.9');
    });

    it('falls back to req.ip when the Authorization header is malformed', async () => {
      const tracker = await getTracker({
        headers: { authorization: 'Bearer not-a-jwt' },
        ip: '9.9.9.9',
      });

      expect(tracker).toBe('9.9.9.9');
    });
  });

  describe('/health throttling exemption', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        // Deliberately tiny limit so any throttling would trip immediately.
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 2 }])],
        controllers: [AppController],
        providers: [
          AppService,
          { provide: APP_GUARD, useClass: ClerkThrottlerGuard },
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('never throttles /health even past the configured limit', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).get('/health').expect(200);
      }
    });
  });
});

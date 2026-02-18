import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const sessionToken = await clerkClient.verifyToken(token, {
        secretKey: this.configService.get<string>('CLERK_SECRET_KEY'),
      });

      if (!sessionToken) {
        throw new UnauthorizedException('Invalid token');
      }

      // Attach user info to request
      request.user = {
        clerkId: sessionToken.sub,
        sessionId: sessionToken.sid,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

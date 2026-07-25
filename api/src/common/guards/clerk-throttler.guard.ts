import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Decode the `sub` (Clerk user id) claim from a `Bearer <jwt>` header without
 * verifying the signature. This is used ONLY as a rate-limit bucket key — real
 * authentication still happens later in ClerkAuthGuard. Returns null on any
 * missing/malformed input.
 */
function subFromBearer(authHeader: unknown): string | null {
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const payload = token.split('.')[1];
    if (!payload) return null;

    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const claims = JSON.parse(json) as { sub?: unknown };

    return typeof claims.sub === 'string' && claims.sub.length > 0
      ? claims.sub
      : null;
  } catch {
    return null;
  }
}

/**
 * Throttler guard that keys by Clerk user id where we have it, falling back to
 * client IP for public/unauthenticated routes.
 *
 * This guard is registered globally (APP_GUARD), so it runs BEFORE the
 * route-level ClerkAuthGuard — meaning `req.user` is not yet populated at track
 * time. We therefore decode the clerk id straight from the Bearer JWT. Keying by
 * user id (rather than IP alone) avoids punishing multiple users behind one NAT
 * and stops a single user from dodging limits by rotating IPs.
 */
@Injectable()
export class ClerkThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Prefer an already-verified user if a prior guard populated it.
    if (req.user?.clerkId) return req.user.clerkId;

    // Otherwise derive the clerk id from the Bearer token (see subFromBearer).
    const sub = subFromBearer(req.headers?.authorization);
    if (sub) return sub;

    // Public/unauthenticated routes: fall back to the real client IP.
    return req.ip;
  }
}

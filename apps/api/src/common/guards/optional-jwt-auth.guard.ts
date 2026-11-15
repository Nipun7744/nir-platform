import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * For public-but-personalizable routes (e.g. the repository detail page):
 * attaches req.user when a valid bearer token is present, and treats a request
 * WITHOUT a token as anonymous. Combine with @Public() so the global JwtAuthGuard
 * doesn't also enforce a mandatory token.
 *
 * A token that IS sent but is invalid/expired gets a 401 rather than silently
 * downgrading to anonymous (2026-11-15). Otherwise a reviewer whose 15-minute
 * access token had lapsed got a 404 "Innovation not found" for unpublished
 * submissions, and the web client never refreshed because it only does that on
 * 401. The client retries anonymously if the refresh itself fails.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(_err: unknown, user: TUser, _info: unknown, context: ExecutionContext): TUser {
    // passport-jwt calls done(null, false) on a missing/invalid token, so `user` is
    // `false` here, not `null`/`undefined` — `??` doesn't coalesce that, `||` does.
    if (user) return user;
    const auth = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>().headers.authorization;
    if (auth && /^Bearer\s+\S+/i.test(auth)) throw new UnauthorizedException('Access token is invalid or expired');
    return undefined as TUser;
  }
}

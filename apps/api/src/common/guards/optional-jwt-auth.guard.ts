import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * For public-but-personalizable routes (e.g. the repository detail page):
 * attaches req.user when a valid bearer token is present, but never rejects
 * the request when it's absent or invalid. Combine with @Public() so the
 * global JwtAuthGuard doesn't also enforce a mandatory token.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(_err: unknown, user: TUser): TUser {
    // passport-jwt calls done(null, false) on a missing/invalid token, so `user` is
    // `false` here, not `null`/`undefined` — `??` doesn't coalesce that, `||` does.
    return (user || undefined) as TUser;
  }
}

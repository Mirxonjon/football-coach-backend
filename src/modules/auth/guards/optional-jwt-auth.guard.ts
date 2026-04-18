import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Do not throw on missing/invalid token. Return null user instead.
  handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
    if (err) {
      return null;
    }
    // If no user (no token or invalid), return null to keep route public
    if (!user) {
      return null;
    }
    return user;
  }
}

import { IS_PUBLIC_KEY, PermissionMethodsEnum } from '@/types/global/constants';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as Config from '../config/app.config';

import { DefaultStatusEnum } from '@/types/global/constants';
import { Reflector } from '@nestjs/core';


@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    // private organizationService: OrganizationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    const path = (
      request.route?.path || this.getPathFromUrl(request.url)
    )?.split('v1')?.[1];

    this.logger.debug(`Checking permission for ${method} ${path}`);

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('No bearer token provided');
      throw new UnauthorizedException('Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
      payload = this.jwtService.verify(token, {
        secret: Config.JwtConfig.secret,
      });
      console.log(payload , token);
      
      this.logger.debug('Token verified successfully');
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
    
    if (
      payload.is_integrated_token &&
      path.includes('/application') &&
      method === PermissionMethodsEnum.GET
    ) {
      request.organizationId = payload.organization_id;      
      return true;
    }

    if (!payload.user_id) {
      this.logger.warn('Token missing user_id');
      throw new UnauthorizedException('Invalid or expired token');
    }

    try {
      // const user = await this.userService.getById(payload.user_id);
      // request.user = {
      //   user_id: user._id?.toString(),
      //   role: user.role,
      //   full_name: user.full_name,
      // };

      // if (payload?.organizationId) {
      //   await this.organizationService.getById(
      //     payload.organizationId,
      //     undefined
      //   );
      //   request.organizationId = payload.organizationId;
      // }

      // const permissionsResponse = await this.rolePermissionService.getAll({
      //   role: user.role,
      //   status: DefaultStatusEnum.Active,
      //   all: true,
      // });

      // const hasPermission = permissionsResponse.data.some((permission) => {
      //   return (
      //     permission.method === method &&
      //     this.matchPathPattern(permission.path, path)
      //   );
      // });

      // if (!hasPermission) {
      //   this.logger.warn(
      //     `Permission denied for ${user.role} to ${method} ${path}`
      //   );
      //   throw new ForbiddenException(
      //     'You do not have permission to access this resource'
      //   );
      // }

      // this.logger.debug(`Access granted for ${user.role} to ${method} ${path}`);

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error during permission check: ${error.message}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private getPathFromUrl(url: string): string {
    const basePath = url.split('?')[0];

    return basePath;
  }

  private matchPathPattern(pattern: string, actualPath: string): boolean {
    const patternSegments = pattern.split('/').filter(Boolean);
    const actualSegments = actualPath.split('/').filter(Boolean);

    if (patternSegments.length !== actualSegments.length) {
      return false;
    }

    for (let i = 0; i < patternSegments.length; i++) {
      if (patternSegments[i].startsWith(':')) {
        continue;
      }

      if (patternSegments[i] !== actualSegments[i]) {
        return false;
      }
    }

    return true;
  }
}

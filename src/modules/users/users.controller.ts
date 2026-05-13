import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from '@/types/users/update-profile.dto';
import { AdminUpdateUserDto } from '@/types/users/admin-update-user.dto';
import { AdminFilterUsersDto } from '@/types/users/admin-filter-users.dto';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

// 5 MB hard cap on avatar uploads — anything bigger is almost certainly wrong.
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/me')
  @ApiOperation({ summary: 'Get my profile' })
  getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.sub);
  }

  @Patch('users/me')
  @ApiOperation({
    summary:
      'Update my profile. Send avatarUrl directly only if you already have a URL — otherwise use POST /users/me/avatar to upload an image file.',
  })
  updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(req.user.sub, dto);
  }

  @Post('users/me/avatar')
  @ApiOperation({
    summary:
      'Upload a new avatar image (JPEG/PNG/WebP/GIF, max 5 MB). Stored under R2 avatars/ folder; old avatar is auto-removed.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG/PNG/WebP/GIF), max 5 MB',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_AVATAR_SIZE })],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!ALLOWED_AVATAR_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported image type: ${file.mimetype}. Allowed: ${ALLOWED_AVATAR_MIME.join(', ')}`,
      );
    }
    return this.usersService.uploadAvatar(req.user.sub, file);
  }

  @Delete('users/me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove my avatar (sets avatarUrl to null)' })
  removeAvatar(@Req() req: any) {
    return this.usersService.deleteAvatar(req.user.sub);
  }

  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminFindAll(@Query() filter: AdminFilterUsersDto) {
    return this.usersService.adminFindAll(filter);
  }

  @Get('admin/users/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminFindOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.adminFindOne(id);
  }

  @Patch('admin/users/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminUpdate(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdate(id, dto);
  }

  @Delete('admin/users/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminSoftDelete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.adminSoftDelete(id);
  }
}

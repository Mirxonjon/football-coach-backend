import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from '@/types/users/update-profile.dto';
import { AdminUpdateUserDto } from '@/types/users/admin-update-user.dto';
import { AdminFilterUsersDto } from '@/types/users/admin-filter-users.dto';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/me')
  getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.sub);
  }

  @Patch('users/me')
  updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(req.user.sub, dto);
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

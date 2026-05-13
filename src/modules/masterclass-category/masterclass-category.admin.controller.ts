import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { MasterclassCategoryService } from './masterclass-category.service';
import { CreateMasterclassCategoryDto } from '@/types/masterclass/create-masterclass-category.dto';
import { UpdateMasterclassCategoryDto } from '@/types/masterclass/update-masterclass-category.dto';

@ApiTags('Admin - Masterclass Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/masterclass-categories')
export class MasterclassCategoryAdminController {
  constructor(private readonly service: MasterclassCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create masterclass category' })
  create(@Body() dto: CreateMasterclassCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update masterclass category' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMasterclassCategoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete masterclass category' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

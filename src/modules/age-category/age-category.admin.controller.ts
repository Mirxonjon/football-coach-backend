import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AgeCategoryService } from './age-category.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAgeCategoryDto } from '@/types/training/create-age-category.dto';
import { UpdateAgeCategoryDto } from '@/types/training/update-age-category.dto';

@ApiTags('Admin - Age Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/age-categories')
export class AgeCategoryAdminController {
  constructor(private readonly ageCategoryService: AgeCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create age category' })
  create(@Body() dto: CreateAgeCategoryDto) {
    return this.ageCategoryService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update age category' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAgeCategoryDto) {
    return this.ageCategoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete age category' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ageCategoryService.remove(id);
  }
}

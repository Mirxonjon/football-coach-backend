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
import { TrainingCategoryService } from './training-category.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTrainingCategoryDto } from '@/types/training/create-training-category.dto';
import { UpdateTrainingCategoryDto } from '@/types/training/update-training-category.dto';

@ApiTags('Admin - Training Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/training-categories')
export class TrainingCategoryAdminController {
  constructor(private readonly trainingCategoryService: TrainingCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create training category' })
  create(@Body() dto: CreateTrainingCategoryDto) {
    return this.trainingCategoryService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update training category' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTrainingCategoryDto) {
    return this.trainingCategoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete training category' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.trainingCategoryService.remove(id);
  }
}

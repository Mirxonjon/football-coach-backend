import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TrainingService } from './training.service';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateAgeCategoryDto } from '@/types/training/create-age-category.dto';
import { UpdateAgeCategoryDto } from '@/types/training/update-age-category.dto';
import { CreateTrainingCategoryDto } from '@/types/training/create-training-category.dto';
import { UpdateTrainingCategoryDto } from '@/types/training/update-training-category.dto';
import { CreateLessonDto } from '@/types/training/create-lesson.dto';
import { UpdateLessonDto } from '@/types/training/update-lesson.dto';
import { CreateLessonBlockDto } from '@/types/training/create-lesson-block.dto';
import { UpdateLessonBlockDto } from '@/types/training/update-lesson-block.dto';
import { FilterLessonDto } from '@/types/training/filter-lesson.dto';
import { FilterTrainingCategoryDto } from '@/types/training/filter-training-category.dto';

@Controller()
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  // ── Public endpoints ──

  @Get('age-categories')
  @Public()
  @ApiTags('Age Categories')
  @ApiOperation({ summary: 'List all age categories' })
  @ApiResponse({ status: 200, description: 'List of age categories' })
  findAllAgeCategories() {
    return this.trainingService.findAllAgeCategories();
  }

  @Get('training-categories')
  @Public()
  @ApiTags('Training Categories')
  @ApiOperation({ summary: 'List training categories' })
  @ApiResponse({ status: 200, description: 'List of training categories' })
  findAllTrainingCategories(@Query() filter: FilterTrainingCategoryDto) {
    return this.trainingService.findAllTrainingCategories(filter.ageCategoryId);
  }

  // ── Authenticated (subscription required) ──

  @Get('lessons')
  @ApiBearerAuth()
  @ApiTags('Lessons')
  @ApiOperation({ summary: 'List lessons (requires active subscription)' })
  @ApiResponse({ status: 200, description: 'List of lessons' })
  @ApiResponse({ status: 403, description: 'Active subscription required' })
  findAllLessons(@Req() req: any, @Query() filter: FilterLessonDto) {
    const userId = req.user?.sub;
    return this.trainingService.findAllLessons(userId, filter.trainingCategoryId);
  }

  @Get('lessons/:id')
  @ApiBearerAuth()
  @ApiTags('Lessons')
  @ApiOperation({ summary: 'Get lesson with blocks (requires active subscription)' })
  @ApiResponse({ status: 200, description: 'Lesson with ordered blocks' })
  @ApiResponse({ status: 403, description: 'Active subscription required' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  findLessonById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.sub;
    return this.trainingService.findLessonById(userId, id);
  }

  // ── Admin: Age Categories ──

  @Post('admin/age-categories')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiTags('Admin - Age Categories')
  @ApiOperation({ summary: 'Create age category' })
  @ApiResponse({ status: 201, description: 'Created' })
  createAgeCategory(@Body() dto: CreateAgeCategoryDto) {
    return this.trainingService.createAgeCategory(dto);
  }

  @Patch('admin/age-categories/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiTags('Admin - Age Categories')
  @ApiOperation({ summary: 'Update age category' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateAgeCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAgeCategoryDto,
  ) {
    return this.trainingService.updateAgeCategory(id, dto);
  }

  @Delete('admin/age-categories/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiTags('Admin - Age Categories')
  @ApiOperation({ summary: 'Delete age category' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  deleteAgeCategory(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.deleteAgeCategory(id);
  }

  // ── Admin: Training Categories ──

  @Post('admin/training-categories')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiTags('Admin - Training Categories')
  @ApiOperation({ summary: 'Create training category' })
  @ApiResponse({ status: 201, description: 'Created' })
  createTrainingCategory(@Body() dto: CreateTrainingCategoryDto) {
    return this.trainingService.createTrainingCategory(dto);
  }

  @Patch('admin/training-categories/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiTags('Admin - Training Categories')
  @ApiOperation({ summary: 'Update training category' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateTrainingCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainingCategoryDto,
  ) {
    return this.trainingService.updateTrainingCategory(id, dto);
  }

  @Delete('admin/training-categories/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiTags('Admin - Training Categories')
  @ApiOperation({ summary: 'Delete training category' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  deleteTrainingCategory(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.deleteTrainingCategory(id);
  }

  // ── Admin: Lessons ──

  @Post('admin/lessons')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiTags('Admin - Lessons')
  @ApiOperation({ summary: 'Create lesson' })
  @ApiResponse({ status: 201, description: 'Created' })
  createLesson(@Body() dto: CreateLessonDto) {
    return this.trainingService.createLesson(dto);
  }

  @Patch('admin/lessons/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiTags('Admin - Lessons')
  @ApiOperation({ summary: 'Update lesson' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateLesson(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.trainingService.updateLesson(id, dto);
  }

  @Delete('admin/lessons/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiTags('Admin - Lessons')
  @ApiOperation({ summary: 'Delete lesson' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  deleteLesson(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.deleteLesson(id);
  }

  // ── Admin: Lesson Blocks ──

  @Post('admin/lessons/:id/blocks')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiTags('Admin - Lesson Blocks')
  @ApiOperation({ summary: 'Create lesson block' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  createBlock(
    @Param('id', ParseIntPipe) lessonId: number,
    @Body() dto: CreateLessonBlockDto,
  ) {
    return this.trainingService.createBlock(lessonId, dto);
  }

  @Patch('admin/blocks/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiTags('Admin - Lesson Blocks')
  @ApiOperation({ summary: 'Update lesson block' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateBlock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLessonBlockDto,
  ) {
    return this.trainingService.updateBlock(id, dto);
  }

  @Delete('admin/blocks/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiTags('Admin - Lesson Blocks')
  @ApiOperation({ summary: 'Delete lesson block' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  deleteBlock(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.deleteBlock(id);
  }
}

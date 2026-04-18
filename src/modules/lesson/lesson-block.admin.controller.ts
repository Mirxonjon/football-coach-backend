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
import { LessonService } from './lesson.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateLessonBlockDto } from '@/types/training/create-lesson-block.dto';
import { UpdateLessonBlockDto } from '@/types/training/update-lesson-block.dto';

@ApiTags('Admin - Lesson Blocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class LessonBlockAdminController {
  constructor(private readonly lessonService: LessonService) {}

  @Post('lessons/:id/blocks')
  @ApiOperation({ summary: 'Add block to lesson' })
  createBlock(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateLessonBlockDto) {
    return this.lessonService.createBlock(id, dto);
  }

  @Patch('blocks/:id')
  @ApiOperation({ summary: 'Update lesson block' })
  updateBlock(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLessonBlockDto) {
    return this.lessonService.updateBlock(id, dto);
  }

  @Delete('blocks/:id')
  @ApiOperation({ summary: 'Delete lesson block' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBlock(@Param('id', ParseIntPipe) id: number) {
    return this.lessonService.removeBlock(id);
  }
}

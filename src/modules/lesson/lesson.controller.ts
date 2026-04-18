import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LessonService } from './lesson.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilterLessonDto } from '@/types/training/filter-lesson.dto';

@ApiTags('Lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get()
  @ApiOperation({ summary: 'List lessons (requires active subscription)' })
  findAll(@Req() req: any, @Query() filter: FilterLessonDto) {
    return this.lessonService.findAll(req.user.sub, filter.trainingCategoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lesson with blocks (requires active subscription)' })
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.lessonService.findOne(req.user.sub, id);
  }
}

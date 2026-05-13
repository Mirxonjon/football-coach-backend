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
  @ApiOperation({
    summary:
      'List lessons with pagination, filters and search. Each row carries an `isLocked` flag.',
    description:
      'Default page=1, limit=12. Pass `all=true` to skip pagination (response omits `meta`). ' +
      '`isFree=true` returns only free lessons. ' +
      '`unlocked=true` is user-aware: for paid/admin users it returns everything, for free users only `isFree=true` lessons. ' +
      'Filters: `trainingCategoryId`, `ageCategoryId`, `search` (UZ/RU title).',
  })
  findAll(@Req() req: any, @Query() filter: FilterLessonDto) {
    return this.lessonService.findAll(req.user.sub, filter);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get lesson with blocks. Free lessons and free blocks are always viewable; paid blocks are returned with isLocked=true and content stripped for unsubscribed users.',
  })
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.lessonService.findOne(req.user.sub, id);
  }
}

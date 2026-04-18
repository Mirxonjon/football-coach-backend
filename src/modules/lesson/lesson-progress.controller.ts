import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LessonService } from './lesson.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateLessonProgressDto } from '@/types/training/update-lesson-progress.dto';

@ApiTags('Lesson Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/lessons')
export class LessonProgressController {
  constructor(private readonly lessonService: LessonService) {}

  @Get('progress')
  @ApiOperation({ summary: 'List all my lesson progress' })
  listMine(@Req() req: any) {
    return this.lessonService.listMyProgress(req.user.sub);
  }

  @Get(':lessonId/progress')
  @ApiOperation({ summary: 'Get my progress for a specific lesson' })
  getMine(@Req() req: any, @Param('lessonId', ParseIntPipe) lessonId: number) {
    return this.lessonService.getMyProgress(req.user.sub, lessonId);
  }

  @Patch(':lessonId/progress')
  @ApiOperation({ summary: 'Update my progress (sets isCompleted when last block reached)' })
  updateMine(
    @Req() req: any,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() dto: UpdateLessonProgressDto,
  ) {
    return this.lessonService.updateMyProgress(req.user.sub, lessonId, dto.lastBlockSequence);
  }
}

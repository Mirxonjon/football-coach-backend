import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TrainingCategoryService } from './training-category.service';
import { Public } from '@/common/decorators/public.decorator';
import { FilterTrainingCategoryDto } from '@/types/training/filter-training-category.dto';
import { OptionalJwtAuthGuard } from '@/modules/auth/guards/optional-jwt-auth.guard';

@ApiTags('Training Categories')
@Controller('training-categories')
export class TrainingCategoryController {
  constructor(
    private readonly trainingCategoryService: TrainingCategoryService,
  ) {}

  @Get()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List training categories with pagination, filters, sort, and per-user progress filter',
    description:
      'Default page=1, limit=12, sortBy=id, sortOrder=desc (newest first). ' +
      'Pass `all=true` to skip pagination. ' +
      '`includeCount=true` adds `lessonCount` to each item. ' +
      '`hasLessons=true` hides empty categories. ' +
      '`progressStatus` (not_started | in_progress | completed) filters categories by what the current user has done — anonymous calls ignore it. ' +
      '`search` matches titleUz/Ru and descriptionUz/Ru, case-insensitive.',
  })
  findAll(@Req() req: any, @Query() filter: FilterTrainingCategoryDto) {
    const userId: number | null = req?.user?.sub ?? null;
    return this.trainingCategoryService.findAll(filter, userId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get one training category' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.trainingCategoryService.findOne(id);
  }
}

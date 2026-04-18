import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrainingCategoryService } from './training-category.service';
import { Public } from '@/common/decorators/public.decorator';
import { FilterTrainingCategoryDto } from '@/types/training/filter-training-category.dto';

@ApiTags('Training Categories')
@Controller('training-categories')
export class TrainingCategoryController {
  constructor(private readonly trainingCategoryService: TrainingCategoryService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List training categories' })
  findAll(@Query() filter: FilterTrainingCategoryDto) {
    return this.trainingCategoryService.findAll(filter.ageCategoryId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get one training category' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.trainingCategoryService.findOne(id);
  }
}

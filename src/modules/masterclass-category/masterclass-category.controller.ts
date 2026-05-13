import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { MasterclassCategoryService } from './masterclass-category.service';
import { FilterMasterclassCategoryDto } from '@/types/masterclass/filter-masterclass-category.dto';

@ApiTags('Masterclass Categories')
@Controller('masterclass-categories')
export class MasterclassCategoryController {
  constructor(private readonly service: MasterclassCategoryService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary:
      'List masterclass categories with pagination, search, sort, and optional masterclass count',
    description:
      'Default page=1, limit=12, sortOrder=desc. ' +
      'Pass `all=true` to skip pagination. ' +
      '`includeCount=true` adds `masterclassCount` to each item. ' +
      '`hasMasterclasses=true` hides empty categories. ' +
      '`search` matches titleUz/Ru, case-insensitive.',
  })
  findAll(@Query() filter: FilterMasterclassCategoryDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get masterclass category by ID (with masterclasses)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}

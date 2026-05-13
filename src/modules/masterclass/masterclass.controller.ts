import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { MasterclassService } from './masterclass.service';
import { FilterMasterclassDto } from '@/types/masterclass/filter-masterclass.dto';

@ApiTags('Masterclasses')
@Controller('masterclasses')
export class MasterclassController {
  constructor(private readonly service: MasterclassService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary:
      'List masterclasses with pagination, filters, sort and search',
    description:
      'Default page=1, limit=12, sortBy=id, sortOrder=desc (newest first). ' +
      'Pass `all=true` to skip pagination. ' +
      'Filters: `masterclassCategoryId`, `search` (UZ/RU title).',
  })
  findAll(@Query() filter: FilterMasterclassDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get masterclass with blocks' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}

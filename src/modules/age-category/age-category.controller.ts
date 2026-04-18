import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AgeCategoryService } from './age-category.service';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Age Categories')
@Controller('age-categories')
export class AgeCategoryController {
  constructor(private readonly ageCategoryService: AgeCategoryService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all age categories' })
  findAll() {
    return this.ageCategoryService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get one age category' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ageCategoryService.findOne(id);
  }
}

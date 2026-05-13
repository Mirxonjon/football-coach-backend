import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { MasterclassService } from './masterclass.service';
import { CreateMasterclassBlockDto } from '@/types/masterclass/create-masterclass-block.dto';
import { UpdateMasterclassBlockDto } from '@/types/masterclass/update-masterclass-block.dto';

@ApiTags('Admin - Masterclass Blocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class MasterclassBlockAdminController {
  constructor(private readonly service: MasterclassService) {}

  @Post('masterclasses/:id/blocks')
  @ApiOperation({ summary: 'Add block to masterclass' })
  createBlock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMasterclassBlockDto,
  ) {
    return this.service.createBlock(id, dto);
  }

  @Patch('masterclass-blocks/:id')
  @ApiOperation({ summary: 'Update masterclass block' })
  updateBlock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMasterclassBlockDto,
  ) {
    return this.service.updateBlock(id, dto);
  }

  @Delete('masterclass-blocks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete masterclass block' })
  removeBlock(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeBlock(id);
  }
}

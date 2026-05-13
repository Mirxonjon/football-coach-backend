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
import { CreateMasterclassDto } from '@/types/masterclass/create-masterclass.dto';
import { UpdateMasterclassDto } from '@/types/masterclass/update-masterclass.dto';

@ApiTags('Admin - Masterclasses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/masterclasses')
export class MasterclassAdminController {
  constructor(private readonly service: MasterclassService) {}

  @Post()
  @ApiOperation({ summary: 'Create masterclass' })
  create(@Body() dto: CreateMasterclassDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update masterclass' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMasterclassDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete masterclass' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

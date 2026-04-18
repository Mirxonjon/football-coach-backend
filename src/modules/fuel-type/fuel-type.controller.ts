import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FuelTypeService } from './fuel-type.service';
import { CreateFuelTypeDto } from './types/create-fuel-type.dto';
import { UpdateFuelTypeDto } from './types/update-fuel-type.dto';
import { FuelTypeResponseDto } from './types/fuel-type-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Fuel Types')
@ApiBearerAuth()
@Controller('fuel-types')
export class FuelTypeController {
  constructor(private readonly fuelTypeService: FuelTypeService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new fuel type' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The fuel type has been successfully created.',
    type: FuelTypeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'FuelType name must be unique.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  async create(@Body() createDto: CreateFuelTypeDto) {
    return this.fuelTypeService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fuel types' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all fuel types.',
    type: [FuelTypeResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async findAll() {
    return this.fuelTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fuel type by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The fuel type details.',
    type: FuelTypeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'FuelType not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fuelTypeService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a fuel type' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The fuel type has been successfully updated.',
    type: FuelTypeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'FuelType not found.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'FuelType name must be unique.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFuelTypeDto
  ) {
    return this.fuelTypeService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a fuel type' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The fuel type has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'FuelType not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.fuelTypeService.remove(id);
  }
}

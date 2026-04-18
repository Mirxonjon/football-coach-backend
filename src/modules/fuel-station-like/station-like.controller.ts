import { Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FuelStationLikeService } from './station-like.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { ListQueryDto } from '@/types/global/dto/list-query.dto';
import { FuelStationCheckLikedResponseDto, FuelStationCountResponseDto, FuelStationLikeListResponseDto } from './dto/station-like-response.dto';
import { ToggleLikeResponseDto } from './dto/toggle-like.dto';

@ApiTags('FuelStationLike')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fuel-station-likes')
export class FuelStationLikeController {
  constructor(private readonly service: FuelStationLikeService) {}

  @Post(':fuelStationId/toggle')
  @ApiOperation({ summary: 'Toggle like for a fuel station' })
  @ApiResponse({ status: 200, type: ToggleLikeResponseDto })
  async toggle(
    @Param('fuelStationId', ParseIntPipe) fuelStationId: number,
    @Req() req: Request
  ): Promise<ToggleLikeResponseDto> {
    const userId = (req as any).user.sub as number;
    return this.service.toggle(userId, fuelStationId);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my liked fuel stations with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, type: FuelStationLikeListResponseDto })
  async my(@Req() req: Request, @Query() query: ListQueryDto): Promise<FuelStationLikeListResponseDto> {
    const userId = (req as any).user.sub as number;
    
    const { page = 1, limit = 10 } = query;
    return this.service.myLikes(userId, page, limit);
  }

  @Get('station/:fuelStationId/count')
  @ApiOperation({ summary: 'Get like count for a fuel station' })
  @ApiResponse({ status: 200, type: FuelStationCountResponseDto })
  async count(@Param('fuelStationId', ParseIntPipe) fuelStationId: number): Promise<FuelStationCountResponseDto> {
    const count = await this.service.countForStation(fuelStationId);
    return { count };
  }

  @Get('station/:fuelStationId/check')
  @ApiOperation({ summary: 'Check if current user liked this fuel station' })
  @ApiResponse({ status: 200, type: FuelStationCheckLikedResponseDto })
  async check(
    @Param('fuelStationId', ParseIntPipe) fuelStationId: number,
    @Req() req: Request
  ): Promise<FuelStationCheckLikedResponseDto> {
    const userId = (req as any).user.sub as number;
    const liked = await this.service.checkLiked(userId, fuelStationId);
    return { liked };
  }
}

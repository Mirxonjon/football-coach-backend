import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CardsService } from './cards.service';
import { CreateCardDto } from '@/types/payments/create-card.dto';

@ApiTags('Cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'List user cards' })
  list(@Req() req: any) {
    return this.cardsService.list(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Add a card' })
  create(@Req() req: any, @Body() dto: CreateCardDto) {
    return this.cardsService.create(req.user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a card' })
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.cardsService.remove(req.user.sub, id);
  }
}

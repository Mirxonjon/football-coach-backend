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
import { InitCardDto, VerifyCardDto } from '@/types/payments/init-card.dto';

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

  @Post('init')
  @ApiOperation({
    summary: 'Start adding a card — requests a Click card_token and triggers SMS',
  })
  initAdd(@Req() req: any, @Body() dto: InitCardDto) {
    return this.cardsService.initAdd(req.user.sub, dto);
  }

  @Post('verify')
  @ApiOperation({
    summary: 'Verify OTP from Click and save the card for future auto-pay',
  })
  verifyAdd(@Req() req: any, @Body() dto: VerifyCardDto) {
    return this.cardsService.verifyAdd(req.user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a saved card' })
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.cardsService.remove(req.user.sub, id);
  }
}

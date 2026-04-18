import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { WalletService } from './wallet.service';
import { WalletQueryDto } from '@/types/payments/wallet-query.dto';
import { ConfirmTransactionDto } from '@/types/payments/confirm-transaction.dto';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'List own wallet transactions' })
  list(@Req() req: any, @Query() query: WalletQueryDto) {
    return this.walletService.listTransactions(req.user.sub, query);
  }

  @Post('transactions/:id/confirm')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Confirm a transaction (admin/webhook)' })
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmTransactionDto,
  ) {
    return this.walletService.confirmTransaction(id, dto);
  }
}

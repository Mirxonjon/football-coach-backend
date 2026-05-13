import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { InternalPaymentProvider } from './providers/internal.provider';
import { ClickProvider } from './providers/click.provider';

@Module({
  imports: [PrismaModule],
  controllers: [CardsController, WalletController],
  providers: [
    CardsService,
    WalletService,
    InternalPaymentProvider,
    ClickProvider,
  ],
  exports: [CardsService, WalletService, InternalPaymentProvider, ClickProvider],
})
export class PaymentsModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { InternalPaymentProvider } from './providers/internal.provider';

@Module({
  imports: [PrismaModule],
  controllers: [CardsController, WalletController],
  providers: [
    CardsService,
    WalletService,
    InternalPaymentProvider,
  ],
  exports: [CardsService, WalletService, InternalPaymentProvider],
})
export class PaymentsModule {}

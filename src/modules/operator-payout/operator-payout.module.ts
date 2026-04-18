import { Module } from '@nestjs/common';
import { OperatorPayoutService } from './operator-payout.service';
import { OperatorPayoutController } from './operator-payout.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  providers: [OperatorPayoutService],
  controllers: [OperatorPayoutController],
})
export class OperatorPayoutModule {}

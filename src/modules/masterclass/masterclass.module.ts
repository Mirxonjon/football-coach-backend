import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { MasterclassCategoryModule } from '@/modules/masterclass-category/masterclass-category.module';
import { MasterclassService } from './masterclass.service';
import { MasterclassController } from './masterclass.controller';
import { MasterclassAdminController } from './masterclass.admin.controller';
import { MasterclassBlockAdminController } from './masterclass-block.admin.controller';

@Module({
  imports: [PrismaModule, AuthModule, MasterclassCategoryModule],
  controllers: [
    MasterclassController,
    MasterclassAdminController,
    MasterclassBlockAdminController,
  ],
  providers: [MasterclassService],
  exports: [MasterclassService],
})
export class MasterclassModule {}

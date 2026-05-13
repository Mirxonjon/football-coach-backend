import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { MasterclassCategoryService } from './masterclass-category.service';
import { MasterclassCategoryController } from './masterclass-category.controller';
import { MasterclassCategoryAdminController } from './masterclass-category.admin.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MasterclassCategoryController, MasterclassCategoryAdminController],
  providers: [MasterclassCategoryService],
  exports: [MasterclassCategoryService],
})
export class MasterclassCategoryModule {}

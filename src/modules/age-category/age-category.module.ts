import { Module } from '@nestjs/common';
import { AgeCategoryController } from './age-category.controller';
import { AgeCategoryAdminController } from './age-category.admin.controller';
import { AgeCategoryService } from './age-category.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AgeCategoryController, AgeCategoryAdminController],
  providers: [AgeCategoryService],
  exports: [AgeCategoryService],
})
export class AgeCategoryModule {}

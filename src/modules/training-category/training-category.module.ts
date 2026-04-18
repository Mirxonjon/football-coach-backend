import { Module } from '@nestjs/common';
import { TrainingCategoryController } from './training-category.controller';
import { TrainingCategoryAdminController } from './training-category.admin.controller';
import { TrainingCategoryService } from './training-category.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AgeCategoryModule } from '../age-category/age-category.module';

@Module({
  imports: [PrismaModule, AuthModule, AgeCategoryModule],
  controllers: [TrainingCategoryController, TrainingCategoryAdminController],
  providers: [TrainingCategoryService],
  exports: [TrainingCategoryService],
})
export class TrainingCategoryModule {}

import { Module } from '@nestjs/common';
import { LessonController } from './lesson.controller';
import { LessonAdminController } from './lesson.admin.controller';
import { LessonBlockAdminController } from './lesson-block.admin.controller';
import { LessonProgressController } from './lesson-progress.controller';
import { LessonService } from './lesson.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TrainingCategoryModule } from '../training-category/training-category.module';

@Module({
  imports: [PrismaModule, AuthModule, TrainingCategoryModule],
  controllers: [LessonController, LessonAdminController, LessonBlockAdminController, LessonProgressController],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}

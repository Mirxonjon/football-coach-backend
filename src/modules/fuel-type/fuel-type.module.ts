import { Module } from '@nestjs/common';
import { FuelTypeService } from './fuel-type.service';
import { FuelTypeController } from './fuel-type.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [FuelTypeController],
    providers: [FuelTypeService],
    exports: [FuelTypeService],
})
export class FuelTypeModule { }

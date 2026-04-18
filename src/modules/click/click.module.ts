import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ClickController } from './click.controller';
import { ClickService } from './click.service';

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [ClickController],
    providers: [ClickService],
    exports: [ClickService],
})
export class ClickModule { }

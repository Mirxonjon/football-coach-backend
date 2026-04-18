import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TelegramConfig,
  appConfig,
  dbConfig,
  minioConfig,
  openAIConfig,
} from './common/config/app.config';
import { APP_FILTER } from '@nestjs/core';
import { CronJobModule } from './common/cron/cron.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AllExceptionFilter } from './common/filter/all-exceptions.filter';

import { TelegrafModule } from 'nestjs-telegraf';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OperatorModule } from './modules/operator/operator.module';
import { FuelStationModule } from './modules/fuel-station/fuel-station.module';
import { FuelPumpModule } from './modules/fuel-pump/fuel-pump.module';
import { FuelPumpStatusLogModule } from './modules/fuel-pump-status-log/fuel-pump-status-log.module';
import { FuelPumpFuelModule } from './modules/fuel-pump-fuel/fuel-pump-fuel.module';
import { FuelSessionModule } from './modules/fuel-session/fuel-session.module';
import { OperatorPayoutModule } from './modules/operator-payout/operator-payout.module';
import { LegalModule } from './modules/legal/legal.module';
// DiscountModule removed
import { FuelStationLikeModule } from './modules/fuel-station-like/station-like.module';
import { NotificationModule } from './modules/notification/notification.module';
import { FuelTypeModule } from './modules/fuel-type/fuel-type.module';
import { OcppModule } from './modules/ocpp/ocpp.module';
import { SocketModule } from './modules/socket/socket.module';
import { ClickModule } from './modules/click/click.module';
import { TelegramModule } from './modules/telegram/telegram.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, minioConfig, openAIConfig],
    }),
    // TelegrafModule.forRoot({
    //   token: process.env.TELEGRAM_BOT_TOKEN,
    // }),
    // MongooseModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: (configService: ConfigService) => ({
    //     uri: configService.get<string>('db.url') || process.env.DATABASE_URL,
    //   }),
    //   inject: [ConfigService],
    // }),
    PrismaModule,
    CronJobModule,
    VehicleModule,
    AuthModule,
    UsersModule,
    OperatorModule,
    FuelStationModule,
    FuelPumpModule,
    FuelTypeModule,
    FuelPumpStatusLogModule,
    FuelPumpFuelModule,
    FuelSessionModule,
    OperatorPayoutModule,
    LegalModule,
    FuelStationLikeModule,
    NotificationModule,
    OcppModule,
    SocketModule,
    ClickModule,
    TelegramModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
  ],
})
export class AppModule implements OnModuleInit {
  // constructor(
  //   private readonly userSeedService: UserSeedService,
  //   private readonly rolePermissionSeedService: RolePermissionSeedService
  // ) {}

  async onModuleInit() {
    // await this.rolePermissionSeedService.seed();
    // await this.userSeedService.seed();
  }
}

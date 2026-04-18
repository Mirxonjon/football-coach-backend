import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VehicleService } from './vehicle.service';

@Injectable()
export class VehicleCronService {
  private logger = new Logger(VehicleCronService.name);
  constructor(private vehicleService: VehicleService) {}

  @Cron('0 3 * * *')
  async nightlySync() {
    try {
      const res = await this.vehicleService.syncExternal();
      this.logger.log(`Vehicle sync completed: created=${res.created} updated=${res.updated}`);
    } catch (e) {
      this.logger.error('Vehicle sync failed', e.stack || e.message);
    }
  }
}

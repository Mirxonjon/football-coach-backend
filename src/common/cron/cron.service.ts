
import { DefaultStatusEnum } from '@/types/global';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';

@Injectable()
export class CronJobService {
  private readonly logger = new Logger(CronJobService.name);

  constructor(
    // @InjectModel(Organization.name)
    // private readonly organizationModel: Model<OrganizationDocument>,
    // private readonly proxyService: ProxyService
  ) {}

  // @Cron(CronExpression.EVERY_3_HOURS)
  async syncClientOrganization() {

  }
}

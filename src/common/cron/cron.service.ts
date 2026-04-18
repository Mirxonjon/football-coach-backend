
import { Injectable, Logger } from '@nestjs/common';

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

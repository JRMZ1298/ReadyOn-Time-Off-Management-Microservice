import { Module } from '@nestjs/common';

import { TimeOffController } from './timeoff.controller';
import { TimeOffService } from './timeoff.service';
import { HcmService } from '../hcm/hcm.service';

@Module({
  controllers: [TimeOffController],
  providers: [TimeOffService, HcmService],
})
export class TimeOffModule {}

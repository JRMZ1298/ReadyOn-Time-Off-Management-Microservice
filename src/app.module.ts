import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TimeOffModule } from './modules/timeoff/timeoff.module';
import { EventsModule } from './modules/events/events.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventsModule,
    PrismaModule,
    TimeOffModule,
  ],
})
export class AppModule {}

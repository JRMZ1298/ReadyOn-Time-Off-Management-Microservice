import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { OutboxProcessor } from './outbox.processor';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [PrismaService, OutboxService, OutboxProcessor],
  exports: [OutboxService],
})
export class EventsModule {}

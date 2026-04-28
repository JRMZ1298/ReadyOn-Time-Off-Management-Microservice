/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';

import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Cron('*/10 * * * * *')
  async publishEvents() {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        processed: false,
      },
      take: 50,
    });

    for (const event of events) {
      try {
        // Aquí luego Kafka/SQS
        this.logger.log(`Publishing ${event.eventType}`);

        console.log('EVENT:', event.eventType, event.payload);

        await this.prisma.outboxEvent.update({
          where: {
            id: event.id,
          },
          data: {
            processed: true,
          },
        });
      } catch {
        this.logger.error('publish failed');
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OutboxService {
  constructor(private prisma: PrismaService) {}

  async addEvent(eventType: string, aggregateId: string, payload: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await this.prisma.outboxEvent.create({
      data: {
        eventType,
        aggregateId,
        payload: JSON.stringify(payload),
      },
    });
  }
}

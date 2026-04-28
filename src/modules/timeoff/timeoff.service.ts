/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { HcmService } from '../hcm/hcm.service';
import { CreateTimeOffDto } from './dto/create-timeoff.dto';
import { SyncBalanceDto } from './dto/sync-balance.dto';
import { ReconcileBalanceDto } from './dto/reconcile-balance.dto';
import { hashRequest } from './utils/hash-request';

export interface result {
  employeeId: string;
  status: string;
  reason?: string;
  drift?: number;
}

@Injectable()
export class TimeOffService {
  constructor(
    private prisma: PrismaService,
    private hcm: HcmService,
  ) {}

  async requestTimeOff(dto: CreateTimeOffDto, idempotencyKey: string) {
    if (!idempotencyKey) {
      throw new BadRequestException('Missing Idempotency-Key');
    }

    const payloadHash = hashRequest(dto);

    // ¿ya existe request previa?
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: {
        id: idempotencyKey,
      },
    });
    if (existing) {
      if (existing.requestHash !== payloadHash) {
        throw new BadRequestException(
          'Idempotency key reused with different payload',
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(existing.responseBody);
    }

    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveType: {
            employeeId: dto.employeeId,
            leaveType: 'vacation',
          },
        },
      });
      if (!balance) {
        throw new NotFoundException('Balance not found');
      }

      const available = balance.hcmBalance - balance.reservedDays;

      if (available < dto.requestedDays) {
        throw new BadRequestException('Insufficient balance');
      }
      const request = await tx.timeOffRequest.create({
        data: {
          employeeId: dto.employeeId,
          requestedDays: dto.requestedDays,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: 'PENDING',
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateId: request.id,
          eventType: 'TimeOffRequested',
          payload: JSON.stringify({
            employeeId: request.employeeId,
            days: request.requestedDays,
          }),
        },
      });

      await tx.idempotencyKey.create({
        data: {
          id: idempotencyKey,
          endpoint: '/time-off/requests',
          requestHash: payloadHash,
          responseBody: JSON.stringify(request),
        },
      });

      return request;
    });
  }

  async getEmployeeBalance(employeeId: string) {
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveType: {
          employeeId,
          leaveType: 'vacation',
        },
      },
    });

    if (!balance) {
      throw new NotFoundException('Balance not found');
    }

    return {
      hcmBalance: balance.hcmBalance,
      reservedDays: balance.reservedDays,
      availableBalance: balance.hcmBalance - balance.reservedDays,
      version: balance.version,
    };
  }

  async cancelRequest(requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({
        where: {
          id: requestId,
        },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (request.status === 'CANCELLED') {
        throw new BadRequestException('Already cancelled');
      }

      if (new Date() > request.startDate) {
        throw new BadRequestException('Cannot cancel started leave');
      }

      if (request.status === 'PENDING') {
        await tx.timeOffRequest.update({
          where: {
            id: requestId,
          },
          data: {
            status: 'CANCELLED',
          },
        });
        await tx.outboxEvent.create({
          data: {
            aggregateId: request.id,
            eventType: 'TimeOffCancelled',
            payload: JSON.stringify(request),
          },
        });
        return {
          message: 'Request cancelled',
        };
      } else if (request.status === 'APPROVED') {
        const reservation = await tx.reservation.findUnique({
          where: {
            requestId,
          },
        });

        if (!reservation) {
          throw new NotFoundException('Reservation missing');
        }

        await tx.timeOffRequest.update({
          where: {
            id: requestId,
          },
          data: {
            status: 'CANCELLED',
          },
        });

        await tx.outboxEvent.create({
          data: {
            aggregateId: request.id,
            eventType: 'TimeOffCancelled',
            payload: JSON.stringify(request),
          },
        });

        await tx.leaveBalance.update({
          where: {
            employeeId_leaveType: {
              employeeId: request.employeeId,
              leaveType: 'vacation',
            },
          },
          data: {
            reservedDays: {
              decrement: reservation.daysHeld,
            },
            version: {
              increment: 1,
            },
          },
        });

        await tx.reservation.delete({
          where: {
            requestId,
          },
        });

        return {
          message: 'Approved request cancelled',
        };
      }
      throw new BadRequestException('Cannot cancel request in this state');
    });
  }

  async syncBalance(dto: SyncBalanceDto) {
    const balance = await this.prisma.leaveBalance.update({
      where: {
        employeeId_leaveType: {
          employeeId: dto.employeeId,
          leaveType: 'vacation',
        },
      },
      data: {
        hcmBalance: dto.newBalance,
        lastSyncedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    if (dto.newBalance < balance.reservedDays) {
      throw new BadRequestException('Drift inconsistency');
    }

    await this.prisma.outboxEvent.create({
      data: {
        aggregateId: dto.employeeId,
        eventType: 'BalanceSynced',
        payload: JSON.stringify(dto),
      },
    });

    return {
      synced: true,
      available: balance.hcmBalance - balance.reservedDays,
    };
  }

  async approveRequest(requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (request.status !== 'PENDING') {
        throw new BadRequestException('Only pending requests can be approved');
      }
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveType: {
            employeeId: request.employeeId,
            leaveType: 'vacation',
          },
        },
      });

      if (!balance) {
        throw new NotFoundException('Balance not found');
      }

      const available = balance.hcmBalance - balance.reservedDays;
      if (available < request.requestedDays) {
        throw new BadRequestException('Insufficient balance');
      }

      // revalidar con HCM
      const hcmCheck = this.hcm.validateBalance(
        request.employeeId,
        request.requestedDays,
      );

      if (!(await hcmCheck).approved) {
        throw new BadRequestException('Rejected by HCM');
      }

      // confirmar ausencia en HCM
      await this.hcm.submitAbsence();
      await tx.reservation.create({
        data: {
          requestId: request.id,
          employeeId: request.employeeId,
          daysHeld: request.requestedDays,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      await tx.leaveBalance.update({
        where: {
          employeeId_leaveType: {
            employeeId: request.employeeId,
            leaveType: 'vacation',
          },
        },
        data: {
          reservedDays: {
            increment: request.requestedDays,
          },
          version: {
            increment: 1,
          },
        },
      });

      const approved = await tx.timeOffRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: 'APPROVED',
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateId: request.id,
          eventType: 'TimeOffApproved',
          payload: JSON.stringify(request),
        },
      });

      return approved;
    });
  }

  async rejectRequest(requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({
        where: {
          id: requestId,
        },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (request.status !== 'PENDING') {
        throw new BadRequestException('Only pending requests can be rejected');
      }

      const rejected = await tx.timeOffRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: 'REJECTED',
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateId: request.id,
          eventType: 'TimeOffRejected',
          payload: JSON.stringify({
            requestId: request.id,
            employeeId: request.employeeId,
            requestedDays: request.requestedDays,
          }),
        },
      });

      return rejected;
    });
  }

  async reconcileBalances(balances: ReconcileBalanceDto[]) {
    const results: result[] = [];

    for (const item of balances) {
      const balance = await this.prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveType: {
            employeeId: item.employeeId,
            leaveType: 'vacation',
          },
        },
      });
      if (!balance) {
        results.push({
          employeeId: item.employeeId,
          status: 'NOT_FOUND',
        });

        continue;
      }

      const drift = item.newBalance - balance.hcmBalance;

      // conflicto:
      // HCM menor que reservado
      if (item.newBalance < balance.reservedDays) {
        results.push({
          employeeId: item.employeeId,
          status: 'CONFLICT',
          reason: 'reserved exceeds hcm balance',
          drift,
        });

        continue;
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.leaveBalance.update({
          where: {
            id: balance.id,
          },
          data: {
            hcmBalance: item.newBalance,

            version: {
              increment: 1,
            },

            lastSyncedAt: new Date(),
          },
        });
        await tx.outboxEvent.create({
          data: {
            aggregateId: item.employeeId,

            eventType: 'BalanceReconciled',

            payload: JSON.stringify({
              employeeId: item.employeeId,
              oldBalance: balance.hcmBalance,
              newBalance: item.newBalance,
              drift,
            }),
          },
        });
      });

      results.push({
        employeeId: item.employeeId,
        status: 'RECONCILED',
        drift,
      });
    }

    return {
      processed: results.length,
      results,
    };
  }
}

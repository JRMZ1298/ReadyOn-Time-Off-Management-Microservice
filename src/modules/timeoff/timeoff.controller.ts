import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Headers,
} from '@nestjs/common';

import { TimeOffService } from './timeoff.service';
import { CreateTimeOffDto } from './dto/create-timeoff.dto';
import { SyncBalanceDto } from './dto/sync-balance.dto';
import { ReconcileBalanceDto } from './dto/reconcile-balance.dto';

@Controller('time-off')
export class TimeOffController {
  constructor(private service: TimeOffService) {}

  @Post('requests')
  create(
    @Body()
    dto: CreateTimeOffDto,

    @Headers('idempotency-key')
    idempotencyKey: string,
  ) {
    return this.service.requestTimeOff(dto, idempotencyKey);
  }

  @Get('/employees/:employeeId/balance')
  getBalance(
    @Param('employeeId')
    employeeId: string,
  ) {
    return this.service.getEmployeeBalance(employeeId);
  }

  @Patch('requests/:id/cancel')
  cancel(
    @Param('id')
    id: string,
  ) {
    return this.service.cancelRequest(id);
  }

  @Post('balances/sync')
  sync(
    @Body()
    dto: SyncBalanceDto,
  ) {
    return this.service.syncBalance(dto);
  }

  @Post('requests/:id/approve')
  approve(
    @Param('id')
    id: string,
  ) {
    return this.service.approveRequest(id);
  }

  @Post('requests/:id/reject')
  reject(
    @Param('id')
    id: string,
  ) {
    return this.service.rejectRequest(id);
  }

  @Post('balances/reconcile')
  reconcile(
    @Body()
    balances: ReconcileBalanceDto[],
  ) {
    return this.service.reconcileBalances(balances);
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';

@Injectable()
export class HcmService {
  async validateBalance(employeeId: string, days: number) {
    return {
      approved: true,
      currentBalance: 10,
    };
  }

  async submitAbsence() {
    return {
      success: true,
    };
  }
}

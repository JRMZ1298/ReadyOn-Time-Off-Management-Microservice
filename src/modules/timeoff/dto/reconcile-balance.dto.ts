import { IsString, IsNumber } from 'class-validator';

export class ReconcileBalanceDto {
  @IsString()
  employeeId!: string;

  @IsNumber()
  newBalance!: number;
}

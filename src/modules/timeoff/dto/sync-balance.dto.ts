import { IsString, IsNumber } from 'class-validator';

export class SyncBalanceDto {
  @IsString()
  employeeId!: string;

  @IsNumber()
  newBalance!: number;
}

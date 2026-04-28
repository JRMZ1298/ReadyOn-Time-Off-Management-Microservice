import { IsString, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateTimeOffDto {
  @IsString()
  employeeId!: string;

  @IsNumber()
  @Min(0.5)
  requestedDays!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

import { IsDefined, IsOptional, IsString, Matches } from 'class-validator';

export class SendMonthlyRequestsReportDto {
  @IsString()
  @IsDefined()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from: string;

  @IsString()
  @IsDefined()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

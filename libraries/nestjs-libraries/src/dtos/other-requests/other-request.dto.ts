import {
  IsArray,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  OtherRequestPriority,
  OtherRequestStatus,
} from '@prisma/client';

export class CreateOtherRequestDto {
  @IsString()
  @IsDefined()
  title: string;

  @IsString()
  @IsDefined()
  description: string;

  @IsEnum(OtherRequestPriority)
  @IsDefined()
  priority: OtherRequestPriority;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];
}

export class UpdateOtherRequestDto {
  @IsString()
  @IsDefined()
  title: string;

  @IsString()
  @IsDefined()
  description: string;

  @IsEnum(OtherRequestPriority)
  @IsDefined()
  priority: OtherRequestPriority;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];
}

export class UpdateOtherRequestStatusDto {
  @IsEnum(OtherRequestStatus)
  @IsDefined()
  status: OtherRequestStatus;
}

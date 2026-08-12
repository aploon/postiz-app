import {
  IsArray,
  IsDateString,
  IsDefined,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { PostRequestStatus } from '@prisma/client';

export class CreatePostRequestDto {
  @IsString()
  @IsDefined()
  title: string;

  @IsString()
  @IsDefined()
  description: string;

  @IsDateString()
  @IsDefined()
  publishDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];

  @IsOptional()
  @IsIn(['DRAFT', 'REQUESTED'])
  status?: 'DRAFT' | 'REQUESTED';
}

export class UpdatePostRequestDto {
  @IsString()
  @IsDefined()
  title: string;

  @IsString()
  @IsDefined()
  description: string;

  @IsDateString()
  @IsDefined()
  publishDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];

  @IsOptional()
  @IsIn(['DRAFT', 'REQUESTED'])
  status?: 'DRAFT' | 'REQUESTED';
}

export class UpdatePostRequestStatusDto {
  @IsEnum(PostRequestStatus)
  @IsDefined()
  status: PostRequestStatus;

  @ValidateIf((o) => o.status === PostRequestStatus.PUBLISHED)
  @IsString()
  @IsUrl({}, { message: 'A valid article link is required to publish' })
  link?: string;
}

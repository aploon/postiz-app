import {
  IsDefined,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Provider } from '@prisma/client';

export class CreateOrgUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @IsDefined()
  @ValidateIf((o) => !o.providerToken)
  password: string;

  @IsString()
  @IsDefined()
  provider: Provider;

  @IsString()
  @IsDefined()
  @ValidateIf((o) => !o.password)
  providerToken: string;

  @IsEmail()
  @IsDefined()
  @ValidateIf((o) => !o.providerToken)
  email: string;

  // Optional for team-invite registration (user joins an existing org).
  @IsString()
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @MinLength(3)
  @MaxLength(128)
  company?: string;

  datafast_visitor_id: string;
}

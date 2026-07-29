import {
  IsDefined,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Provider } from '@prisma/client';

export class RegisterTakkaAdminDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @IsDefined()
  password: string;

  @IsEmail()
  @IsDefined()
  email: string;

  @IsString()
  @IsDefined()
  provider: Provider;

  datafast_visitor_id?: string;
}

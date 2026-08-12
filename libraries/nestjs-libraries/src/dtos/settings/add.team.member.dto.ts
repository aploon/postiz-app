import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AddTeamMemberDto {
  @IsDefined()
  @IsEmail()
  @ValidateIf((o) => o.sendEmail)
  email: string;

  @IsString()
  @IsIn(['USER', 'ADMIN', 'SUPERADMIN'])
  role: string;

  @IsDefined()
  @IsBoolean()
  sendEmail: boolean;

  @IsOptional()
  @IsBoolean()
  makeTakkaAdmin?: boolean;

  /** Takka admin only: target org id, or `new` to create one at invite time. */
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ValidateIf((o) => o.organizationId === 'new')
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  organizationName?: string;
}

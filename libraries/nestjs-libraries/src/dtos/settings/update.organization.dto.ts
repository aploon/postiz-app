import { IsDefined, IsString, MinLength } from 'class-validator';

export class UpdateOrganizationDto {
  @IsString()
  @IsDefined()
  @MinLength(2)
  name: string;
}

import { IsDefined, IsOptional, IsString } from 'class-validator';

export class CreatePostRequestCategoryDto {
  @IsString()
  @IsDefined()
  name: string;
}

export class UpdatePostRequestCategoryDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsDefined()
  name: string;
}

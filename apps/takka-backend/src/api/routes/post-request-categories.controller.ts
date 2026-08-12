import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { PostRequestCategoryService } from '@gitroom/nestjs-libraries/database/prisma/post-request-categories/post-request-category.service';
import {
  CreatePostRequestCategoryDto,
  UpdatePostRequestCategoryDto,
} from '@gitroom/nestjs-libraries/dtos/post-request-categories/post-request-category.dto';

@ApiTags('Post Request Categories')
@Controller('/post-request-categories')
export class PostRequestCategoriesController {
  constructor(
    private _postRequestCategoryService: PostRequestCategoryService
  ) {}

  @Get('/')
  list(@GetOrgFromRequest() org: Organization) {
    return this._postRequestCategoryService.list(org.id);
  }

  @Post('/')
  create(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreatePostRequestCategoryDto
  ) {
    return this._postRequestCategoryService.create(org.id, body);
  }

  @Put('/:id')
  update(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdatePostRequestCategoryDto
  ) {
    return this._postRequestCategoryService.update(org.id, id, body);
  }

  @Delete('/:id')
  delete(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._postRequestCategoryService.delete(org.id, id);
  }
}

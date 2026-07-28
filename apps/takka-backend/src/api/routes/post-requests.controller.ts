import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { PostRequestService } from '@gitroom/nestjs-libraries/database/prisma/post-requests/post-request.service';
import {
  CreatePostRequestDto,
  UpdatePostRequestDto,
  UpdatePostRequestStatusDto,
} from '@gitroom/nestjs-libraries/dtos/post-requests/post-request.dto';

@ApiTags('Post Requests')
@Controller('/post-requests')
export class PostRequestsController {
  constructor(private _postRequestService: PostRequestService) {}

  @Get('/')
  async list(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Query('page') page = '1'
  ) {
    return this._postRequestService.list(org, user, Number(page) || 1);
  }

  @Get('/:id')
  async get(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    return this._postRequestService.get(org, user, id);
  }

  @Post('/')
  async create(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: CreatePostRequestDto
  ) {
    return this._postRequestService.create(org.id, user.id, body);
  }

  @Put('/:id')
  async update(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string,
    @Body() body: UpdatePostRequestDto
  ) {
    return this._postRequestService.update(org, user, id, body);
  }

  @Delete('/:id')
  async delete(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    return this._postRequestService.delete(org, user, id);
  }

  @Patch('/:id/status')
  async updateStatus(
    @GetUserFromRequest() user: User,
    @Param('id') id: string,
    @Body() body: UpdatePostRequestStatusDto
  ) {
    return this._postRequestService.updateStatus(user, id, body.status);
  }
}

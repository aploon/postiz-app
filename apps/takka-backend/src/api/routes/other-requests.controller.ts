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
import { OtherRequestService } from '@gitroom/nestjs-libraries/database/prisma/other-requests/other-request.service';
import {
  CreateOtherRequestDto,
  UpdateOtherRequestDto,
  UpdateOtherRequestStatusDto,
} from '@gitroom/nestjs-libraries/dtos/other-requests/other-request.dto';

@ApiTags('Other Requests')
@Controller('/other-requests')
export class OtherRequestsController {
  constructor(private _otherRequestService: OtherRequestService) {}

  @Get('/')
  async list(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Query('page') page = '1',
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string
  ) {
    if (user.isTakkaAdmin) {
      return this._otherRequestService.listAdmin(user, {
        page: Number(page) || 1,
        search,
        organizationId,
        status,
        priority,
      });
    }

    return this._otherRequestService.list(org, user, Number(page) || 1);
  }

  @Get('/organizations')
  async listOrganizations(@GetUserFromRequest() user: User) {
    return this._otherRequestService.listOrganizations(user);
  }

  @Get('/:id')
  async get(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    return this._otherRequestService.get(org, user, id);
  }

  @Post('/')
  async create(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: CreateOtherRequestDto
  ) {
    return this._otherRequestService.create(org.id, user.id, body);
  }

  @Put('/:id')
  async update(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string,
    @Body() body: UpdateOtherRequestDto
  ) {
    return this._otherRequestService.update(org, user, id, body);
  }

  @Delete('/:id')
  async delete(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    return this._otherRequestService.delete(org, user, id);
  }

  @Patch('/:id/status')
  async updateStatus(
    @GetUserFromRequest() user: User,
    @Param('id') id: string,
    @Body() body: UpdateOtherRequestStatusDto
  ) {
    return this._otherRequestService.updateStatus(user, id, body.status);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';

@ApiTags('Organizations')
@Controller('/organizations')
export class OrganizationsController {
  constructor(private _organizationService: OrganizationService) {}

  @Get('/')
  async list(
    @GetUserFromRequest() user: User,
    @Query('page') page = '1'
  ) {
    return this._organizationService.listForTakkaAdmin(
      user,
      Number(page) || 1
    );
  }
}

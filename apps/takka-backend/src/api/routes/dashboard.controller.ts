import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { DashboardService } from '@gitroom/nestjs-libraries/database/prisma/dashboard/dashboard.service';

@ApiTags('Dashboard')
@Controller('/dashboard')
export class DashboardController {
  constructor(private _dashboardService: DashboardService) {}

  @Get('/')
  async get(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    return this._dashboardService.getDashboard(user, org);
  }
}

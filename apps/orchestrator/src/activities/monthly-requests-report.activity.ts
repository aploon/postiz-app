import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { MonthlyRequestsReportService } from '@gitroom/nestjs-libraries/database/prisma/requests/monthly-requests-report.service';

@Injectable()
@Activity()
export class MonthlyRequestsReportActivity {
  constructor(
    private _monthlyRequestsReportService: MonthlyRequestsReportService
  ) {}

  @ActivityMethod()
  async maybeSendPreviousMonthReports() {
    return this._monthlyRequestsReportService.maybeSendPreviousMonthReports();
  }
}

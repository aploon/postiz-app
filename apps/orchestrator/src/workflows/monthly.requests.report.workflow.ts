import { proxyActivities, sleep } from '@temporalio/workflow';
import { MonthlyRequestsReportActivity } from '@gitroom/orchestrator/activities/monthly-requests-report.activity';

const { maybeSendPreviousMonthReports } =
  proxyActivities<MonthlyRequestsReportActivity>({
    startToCloseTimeout: '30 minute',
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '2 minutes',
    },
  });

/**
 * Daily check: on the 1st of each month (UTC), emails org ADMIN/SUPERADMIN
 * a previous-calendar-month recap of Post + Other requests (no drafts),
 * and sends an internal copy to Takka admins. Skips orgs with zero requests.
 */
export async function monthlyRequestsReportWorkflow() {
  await maybeSendPreviousMonthReports();
  while (true) {
    await sleep('1 day');
    await maybeSendPreviousMonthReports();
  }
}

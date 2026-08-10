import { Injectable } from '@nestjs/common';
import {
  OtherRequestPriority,
  OtherRequestStatus,
  PostRequestStatus,
} from '@prisma/client';
import { PostRequestRepository } from '@gitroom/nestjs-libraries/database/prisma/post-requests/post-request.repository';
import { OtherRequestRepository } from '@gitroom/nestjs-libraries/database/prisma/other-requests/other-request.repository';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { MonthlyRequestsReportPdfService } from '@gitroom/nestjs-libraries/database/prisma/requests/monthly-requests-report.pdf.service';

type ReportRow = {
  title: string;
  type: 'Post request' | 'Other request';
  status: string;
  priority?: string;
  createdAt: Date;
};

type OrgReport = {
  organizationId: string;
  organizationName: string;
  rows: ReportRow[];
};

@Injectable()
export class MonthlyRequestsReportService {
  constructor(
    private _postRequestRepository: PostRequestRepository,
    private _otherRequestRepository: OtherRequestRepository,
    private _organizationRepository: OrganizationRepository,
    private _usersService: UsersService,
    private _notificationService: NotificationService,
    private _monthlyRequestsReportPdfService: MonthlyRequestsReportPdfService
  ) {}

  /**
   * Runs only on the 1st day of the month (UTC). Sends one report per org
   * that had non-draft requests created in the previous calendar month.
   */
  async maybeSendPreviousMonthReports() {
    const now = new Date();
    if (now.getUTCDate() !== 1) {
      return { skipped: true, reason: 'not-first-of-month-utc' as const };
    }

    if (!this._notificationService.hasEmailProvider()) {
      return { skipped: true, reason: 'no-email-provider' as const };
    }

    const { from, to, periodLabel } = this.previousCalendarMonthUtc(now);
    return this.sendReportsForRange(from, to, periodLabel);
  }

  /** Manual trigger for Takka admins with a custom UTC date range. */
  async sendReportsForCustomRange(fromInput: string, toInput: string) {
    if (!this._notificationService.hasEmailProvider()) {
      return { skipped: true, reason: 'no-email-provider' as const, sent: 0 };
    }

    const from = this.parseUtcDayStart(fromInput);
    const to = this.parseUtcDayEnd(toInput);

    if (!from || !to) {
      return { skipped: true, reason: 'invalid-date-range' as const, sent: 0 };
    }

    if (from.getTime() > to.getTime()) {
      return { skipped: true, reason: 'invalid-date-range' as const, sent: 0 };
    }

    const periodLabel = this.formatPeriodLabel(from, to);
    return this.sendReportsForRange(from, to, periodLabel);
  }

  /** @deprecated Prefer sendReportsForCustomRange — kept for callers expecting previous month. */
  async sendPreviousMonthReportsNow() {
    const { from, to } = this.previousCalendarMonthUtc(new Date());
    return this.sendReportsForCustomRange(
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10)
    );
  }

  async sendReportsForRange(from: Date, to: Date, periodLabel: string) {
    const [postRequests, otherRequests, takkaAdmins] = await Promise.all([
      this._postRequestRepository.listForMonthlyReport(from, to),
      this._otherRequestRepository.listForMonthlyReport(from, to),
      this._usersService.findTakkaAdmins(),
    ]);

    const byOrg = new Map<string, OrgReport>();

    for (const item of postRequests) {
      const report = this.ensureOrgReport(
        byOrg,
        item.organizationId,
        item.organization?.name
      );
      report.rows.push({
        title: item.title,
        type: 'Post request',
        status: this.postStatusLabel(item.status),
        createdAt: item.createdAt,
      });
    }

    for (const item of otherRequests) {
      const report = this.ensureOrgReport(
        byOrg,
        item.organizationId,
        item.organization?.name
      );
      report.rows.push({
        title: item.title,
        type: 'Other request',
        status: this.otherStatusLabel(item.status),
        priority: this.priorityLabel(item.priority),
        createdAt: item.createdAt,
      });
    }

    if (!byOrg.size) {
      return { skipped: true, reason: 'no-requests' as const, sent: 0 };
    }

    const takkaEmails = [
      ...new Set(
        takkaAdmins
          .map((admin) => admin.email)
          .filter((email): email is string => !!email && email.includes('@'))
      ),
    ];

    let sent = 0;
    const frontendUrl = process.env.FRONTEND_URL || '';

    for (const report of byOrg.values()) {
      report.rows.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );

      const reference = `RR-${from.getUTCFullYear()}${String(
        from.getUTCMonth() + 1
      ).padStart(2, '0')}-${report.organizationId.slice(0, 8).toUpperCase()}`;

      const { url: pdfUrl } =
        await this._monthlyRequestsReportPdfService.generateAndUpload({
          organizationName: report.organizationName,
          periodLabel,
          rows: report.rows,
          reference,
        });

      const subject = `Monthly requests report — ${report.organizationName} — ${periodLabel}`;
      const html = this.buildEmailHtml({
        organizationName: report.organizationName,
        periodLabel,
        rows: report.rows,
        pdfUrl,
        frontendUrl,
        internal: false,
      });

      const team = await this._organizationRepository.getTeam(
        report.organizationId
      );
      const adminEmails = [
        ...new Set(
          (team?.users || [])
            .filter(
              (member) =>
                member.role === 'ADMIN' || member.role === 'SUPERADMIN'
            )
            .map((member) => member.user?.email)
            .filter(
              (email): email is string => !!email && email.includes('@')
            )
        ),
      ];

      for (const email of adminEmails) {
        await this._notificationService.sendEmail(email, subject, html);
        sent += 1;
      }

      const internalRecipients = takkaEmails.filter(
        (email) => !adminEmails.includes(email)
      );

      if (internalRecipients.length) {
        const internalSubject = `[Internal] ${subject}`;
        const internalHtml = this.buildEmailHtml({
          organizationName: report.organizationName,
          periodLabel,
          rows: report.rows,
          pdfUrl,
          frontendUrl,
          internal: true,
        });
        for (const email of internalRecipients) {
          await this._notificationService.sendEmail(
            email,
            internalSubject,
            internalHtml
          );
          sent += 1;
        }
      }
    }

    return {
      skipped: false as const,
      sent,
      organizations: byOrg.size,
      periodLabel,
    };
  }

  previousCalendarMonthUtc(now = new Date()) {
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0)
    );
    const to = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999)
    );
    const periodLabel = this.formatPeriodLabel(from, to);
    return { from, to, periodLabel };
  }

  private parseUtcDayStart(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date;
  }

  private parseUtcDayEnd(value: string) {
    const start = this.parseUtcDayStart(value);
    if (!start) {
      return null;
    }
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );
  }

  private formatPeriodLabel(from: Date, to: Date) {
    const sameMonth =
      from.getUTCFullYear() === to.getUTCFullYear() &&
      from.getUTCMonth() === to.getUTCMonth() &&
      from.getUTCDate() === 1 &&
      to.getUTCDate() ===
        new Date(
          Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 0)
        ).getUTCDate();

    if (sameMonth) {
      return from.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }

    const format = (date: Date) =>
      date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });

    return `${format(from)} – ${format(to)}`;
  }

  private ensureOrgReport(
    byOrg: Map<string, OrgReport>,
    organizationId: string,
    organizationName?: string | null
  ) {
    let report = byOrg.get(organizationId);
    if (!report) {
      report = {
        organizationId,
        organizationName: organizationName || 'Organization',
        rows: [],
      };
      byOrg.set(organizationId, report);
    }
    return report;
  }

  private buildEmailHtml({
    organizationName,
    periodLabel,
    rows,
    pdfUrl,
    frontendUrl,
    internal,
  }: {
    organizationName: string;
    periodLabel: string;
    rows: ReportRow[];
    pdfUrl: string;
    frontendUrl: string;
    internal: boolean;
  }) {
    const requestsUrl = frontendUrl ? `${frontendUrl}/requests` : '#';
    const previewLimit = 5;
    const previewRows = rows.slice(0, previewLimit);
    const hasMore = rows.length > previewLimit;

    const tableRows = previewRows
      .map(
        (row, index) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${
          index + 1
        }</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${this.escape(
          row.title
        )}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${this.escape(
          row.type
        )}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${this.escape(
          row.status
        )}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${this.escape(
          row.priority || '—'
        )}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${this.formatDate(
          row.createdAt
        )}</td>
      </tr>`
      )
      .join('');

    return `
<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.5;">
  ${
    internal
      ? `<p style="margin:0 0 16px;padding:8px 12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:13px;"><strong>Internal copy</strong> for Takka admins</p>`
      : ''
  }
  <h1 style="margin:0 0 8px;font-size:20px;">Monthly requests report</h1>
  <p style="margin:0 0 16px;font-size:14px;color:#374151;">
    Your Takkatech requests report for <strong>${this.escape(
      organizationName
    )}</strong>
    (<strong>${this.escape(periodLabel)}</strong>, UTC) is ready.
  </p>
  <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">
    ${rows.length} request${rows.length === 1 ? '' : 's'} included.
  </p>

  <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">
    <thead>
      <tr style="background:#f9fafb;text-align:left;">
        <th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#6b7280;">#</th>
        <th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#6b7280;">Title</th>
        <th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#6b7280;">Type</th>
        <th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#6b7280;">Status</th>
        <th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#6b7280;">Priority</th>
        <th style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#6b7280;">Created</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  ${
    hasMore
      ? `<p style="margin:0 0 16px;font-size:13px;color:#6b7280;">more...</p>`
      : `<div style="margin-bottom:16px;"></div>`
  }

  <p style="margin:0 0 20px;">
    <a href="${pdfUrl}" style="display:inline-block;padding:10px 16px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
      Download PDF report
    </a>
  </p>
  <p style="margin:0;font-size:13px;">
    <a href="${requestsUrl}" style="color:#4f46e5;">Open requests in Takka</a>
  </p>
</div>`;
  }

  private formatDate(date: Date) {
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private postStatusLabel(status: PostRequestStatus) {
    switch (status) {
      case PostRequestStatus.REQUESTED:
        return 'Requested';
      case PostRequestStatus.APPROVED:
        return 'Approved';
      case PostRequestStatus.REJECTED:
        return 'Rejected';
      case PostRequestStatus.SCHEDULED:
        return 'Scheduled';
      case PostRequestStatus.PUBLISHED:
        return 'Published';
      default:
        return status;
    }
  }

  private otherStatusLabel(status: OtherRequestStatus) {
    switch (status) {
      case OtherRequestStatus.NEW:
        return 'New';
      case OtherRequestStatus.IN_PROGRESS:
        return 'In progress';
      case OtherRequestStatus.DONE:
        return 'Done';
      case OtherRequestStatus.CLOSED:
        return 'Closed';
      default:
        return status;
    }
  }

  private priorityLabel(priority: OtherRequestPriority) {
    switch (priority) {
      case OtherRequestPriority.LOW:
        return 'Low';
      case OtherRequestPriority.MEDIUM:
        return 'Medium';
      case OtherRequestPriority.HIGH:
        return 'High';
      default:
        return priority;
    }
  }
}

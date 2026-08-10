'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/takka-postiz/components/layout/user.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useModals } from '@gitroom/takka-postiz/components/layout/new-modal';

const toUtcDateInput = (date: Date) => date.toISOString().slice(0, 10);

const previousMonthDefaults = () => {
  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  );
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return {
    from: toUtcDateInput(from),
    to: toUtcDateInput(to),
  };
};

const SendMonthlyReportModal = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const modal = useModals();
  const defaults = useMemo(() => previousMonthDefaults(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [sending, setSending] = useState(false);

  const submit = useCallback(async () => {
    if (!from || !to) {
      toaster.show(
        t('monthly_requests_report_invalid_dates', 'Please choose a valid date range'),
        'warning'
      );
      return;
    }

    if (from > to) {
      toaster.show(
        t(
          'monthly_requests_report_invalid_range',
          'Start date must be before end date'
        ),
        'warning'
      );
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/admin/monthly-requests-report/send', {
        method: 'POST',
        body: JSON.stringify({ from, to }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        toaster.show(
          t(
            'monthly_requests_report_failed',
            'Failed to send monthly requests report'
          ),
          'warning'
        );
        return;
      }

      if (result?.skipped) {
        const reason = result.reason;
        if (reason === 'no-email-provider') {
          toaster.show(
            t(
              'monthly_requests_report_no_email',
              'No email provider configured'
            ),
            'warning'
          );
          return;
        }
        if (reason === 'invalid-date-range') {
          toaster.show(
            t(
              'monthly_requests_report_invalid_range',
              'Start date must be before end date'
            ),
            'warning'
          );
          return;
        }
        if (reason === 'no-requests') {
          toaster.show(
            t(
              'monthly_requests_report_empty',
              'No requests found for the selected period'
            ),
            'warning'
          );
          return;
        }
        toaster.show(
          t('monthly_requests_report_skipped', 'Report skipped'),
          'warning'
        );
        return;
      }

      toaster.show(
        t(
          'monthly_requests_report_sent',
          'Monthly report sent ({{sent}} emails, {{organizations}} organizations)',
          {
            sent: String(result?.sent ?? 0),
            organizations: String(result?.organizations ?? 0),
          }
        ),
        'success'
      );
      modal.closeAll();
    } catch {
      toaster.show(
        t(
          'monthly_requests_report_failed',
          'Failed to send monthly requests report'
        ),
        'warning'
      );
    } finally {
      setSending(false);
    }
  }, [fetch, from, modal, t, to, toaster]);

  return (
    <div className="flex flex-col gap-[16px] p-[16px] pt-0 max-w-[420px]">
      <p className="text-[14px] text-newTableText">
        {t(
          'monthly_requests_report_modal_description',
          'Choose the period (UTC). Organization admins and Takka admins will receive the report.'
        )}
      </p>
      <div className="flex flex-col gap-[6px]">
        <label className="text-[12px] text-newTableText">
          {t('start_date', 'Start date')}
        </label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor outline-none"
        />
      </div>
      <div className="flex flex-col gap-[6px]">
        <label className="text-[12px] text-newTableText">
          {t('end_date', 'End date')}
        </label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor outline-none"
        />
      </div>
      <div className="flex justify-end gap-[8px] mt-[4px]">
        <Button type="button" secondary onClick={() => modal.closeAll()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          type="button"
          loading={sending}
          disabled={sending}
          onClick={submit}
        >
          {t('send_report', 'Send report')}
        </Button>
      </div>
    </div>
  );
};

export const RequestsHubComponent = () => {
  const t = useT();
  const user = useUser();
  const modal = useModals();
  const isTakkaAdmin = user?.isTakkaAdmin === true;

  const openSendReportModal = useCallback(() => {
    modal.openModal({
      title: t('send_monthly_report', 'Send monthly report'),
      withCloseButton: true,
      children: <SendMonthlyReportModal />,
    });
  }, [modal, t]);

  return (
    <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[12px] lg:p-[20px] gap-[20px]">
      <div className="flex flex-wrap items-start justify-between gap-[12px]">
        <div className="min-w-0">
          <h1 className="text-[24px] font-[600]">{t('requests', 'Requests')}</h1>
          <p className="text-newTableText text-[14px] mt-[4px]">
            {t(
              'requests_hub_description',
              'Choose the type of request you want to manage.'
            )}
          </p>
        </div>
        {isTakkaAdmin && (
          <Button secondary onClick={openSendReportModal}>
            {t('send_monthly_report', 'Send monthly report')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] max-w-[900px]">
        <Link
          href="/post-requests"
          className="group border border-newTableBorder rounded-[12px] p-[24px] bg-newBgColorInner hover:bg-boxHover transition-colors"
        >
          <div className="text-[20px] font-[600]">
            {t('post_requests', 'Post Requests')}
          </div>
          <p className="text-newTableText text-[14px] mt-[8px]">
            {t(
              'post_requests_description',
              'Create and manage content requests for your organization.'
            )}
          </p>
        </Link>

        <Link
          href="/other-requests"
          className="group border border-newTableBorder rounded-[12px] p-[24px] bg-newBgColorInner hover:bg-boxHover transition-colors"
        >
          <div className="text-[20px] font-[600]">
            {t('other_requests', 'Other Requests')}
          </div>
          <p className="text-newTableText text-[14px] mt-[8px]">
            {t(
              'other_requests_description',
              'Create and manage other requests for your organization.'
            )}
          </p>
        </Link>
      </div>
    </div>
  );
};

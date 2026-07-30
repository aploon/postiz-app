'use client';

import React, { useCallback, useMemo } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';
import { useUser } from '@gitroom/takka-postiz/components/layout/user.context';
import dayjs from 'dayjs';
import clsx from 'clsx';

type DashboardKind =
  | 'takka_admin'
  | 'client_user'
  | 'client_admin'
  | 'client_superadmin';

type RecentItem = {
  id: string;
  title: string;
  status: string;
  publishDate: string;
  updatedAt: string;
  organization?: { id: string; name: string };
  createdBy?: { id: string; email: string; name: string | null };
};

type TopOrg = {
  id: string;
  name: string;
  validatedCount: number;
};

type DashboardData = {
  kind: DashboardKind;
  kpis: Record<string, number>;
  recent: RecentItem[];
  drafts: RecentItem[];
  topOrganizations: TopOrg[];
  extras: {
    usersCount?: number;
    channelsCount?: number;
    queuedPosts?: number;
  };
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-newColColor text-newTableText',
  REQUESTED: 'bg-boxFocused text-textItemFocused',
  APPROVED: 'bg-emerald-500/15 text-emerald-400',
  REJECTED: 'bg-red-500/15 text-red-400',
  SCHEDULED: 'bg-sky-500/15 text-sky-400',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-400',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  DRAFT: 'draft',
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
};

const StatusBadge = ({ status }: { status: string }) => {
  const t = useT();
  const key = STATUS_LABEL_KEYS[status] || status.toLowerCase();
  return (
    <span
      className={clsx(
        'inline-flex items-center h-[24px] px-[10px] rounded-[6px] text-[11px] font-[600] tracking-wide uppercase whitespace-nowrap',
        STATUS_STYLES[status] || 'bg-newColColor text-newTableText'
      )}
    >
      {t(key, status)}
    </span>
  );
};

const useDashboard = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/dashboard')).json();
  }, [fetch]);

  return useSWR<DashboardData>('takka-dashboard', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

const KpiCard = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <div className="flex flex-col gap-[6px] border border-newTableBorder rounded-[8px] bg-newBgColorInner p-[16px] min-w-0">
    <div className="text-[12px] uppercase tracking-wide text-newTableText truncate">
      {label}
    </div>
    <div className="text-[28px] font-[600] leading-none">{value}</div>
  </div>
);

const RequestRow = ({
  item,
  showOrg,
  onClick,
}: {
  item: RecentItem;
  showOrg?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-start grid grid-cols-[minmax(0,1fr)_110px] sm:grid-cols-[minmax(0,1.5fr)_110px_minmax(0,1fr)_120px] gap-[12px] px-[14px] py-[12px] items-center border-b border-newTableBorder last:border-b-0 hover:bg-boxHover transition-colors"
  >
    <div className="min-w-0">
      <div className="text-[14px] font-[500] truncate">{item.title}</div>
      {showOrg && item.organization?.name && (
        <div className="text-[12px] text-newTableText truncate">
          {item.organization.name}
        </div>
      )}
    </div>
    <div>
      <StatusBadge status={item.status} />
    </div>
    <div className="text-[13px] text-newTableText truncate min-w-0">
      {item.createdBy?.name || item.createdBy?.email || '-'}
    </div>
    <div className="text-[13px] text-newTableText">
      {dayjs(item.publishDate).format('MMM D, YYYY')}
    </div>
  </button>
);

const EmptyBlock = ({ text }: { text: string }) => (
  <div className="px-[14px] py-[24px] text-center text-newTableText text-[14px]">
    {text}
  </div>
);

export const DashboardComponent = () => {
  const t = useT();
  const router = useRouter();
  const user = useUser();
  const { data, isLoading } = useDashboard();

  const kind = data?.kind;
  const isTakkaAdmin = kind === 'takka_admin';
  const isClientUser = kind === 'client_user';
  const isOrgAdmin =
    kind === 'client_admin' || kind === 'client_superadmin';
  const isSuperAdmin = kind === 'client_superadmin';

  const title = useMemo(() => {
    if (isTakkaAdmin) {
      return t('takka_admin_dashboard', 'Takka Admin Dashboard');
    }
    if (isSuperAdmin) {
      return t('organization_dashboard', 'Organization Dashboard');
    }
    if (isOrgAdmin) {
      return t('team_dashboard', 'Team Dashboard');
    }
    return t('my_dashboard', 'My Dashboard');
  }, [isTakkaAdmin, isSuperAdmin, isOrgAdmin, t]);

  const description = useMemo(() => {
    if (isTakkaAdmin) {
      return t(
        'takka_admin_dashboard_description',
        'Review incoming post requests and organization activity.'
      );
    }
    if (isOrgAdmin) {
      return t(
        'org_dashboard_description',
        'Track your organization post requests and team activity.'
      );
    }
    return t(
      'user_dashboard_description',
      'Follow the status of your post requests.'
    );
  }, [isTakkaAdmin, isOrgAdmin, t]);

  const kpiItems = useMemo(() => {
    const kpis = data?.kpis || {};
    if (isTakkaAdmin) {
      return [
        { key: 'organizations', label: t('organizations', 'Organizations') },
        { key: 'requested', label: t('requested', 'Requested') },
        { key: 'approved', label: t('approved', 'Approved') },
        { key: 'rejected', label: t('rejected', 'Rejected') },
        { key: 'scheduled', label: t('scheduled', 'Scheduled') },
        { key: 'published', label: t('published', 'Published') },
      ].map((item) => ({ ...item, value: kpis[item.key] || 0 }));
    }

    if (isOrgAdmin) {
      return [
        { key: 'users', label: t('users', 'Users') },
        { key: 'draft', label: t('my_drafts', 'My drafts') },
        { key: 'requested', label: t('requested', 'Requested') },
        { key: 'approved', label: t('approved', 'Approved') },
        { key: 'rejected', label: t('rejected', 'Rejected') },
        { key: 'scheduled', label: t('scheduled', 'Scheduled') },
        { key: 'published', label: t('published', 'Published') },
      ].map((item) => ({ ...item, value: kpis[item.key] || 0 }));
    }

    return [
      { key: 'draft', label: t('drafts', 'Drafts') },
      { key: 'requested', label: t('requested', 'Requested') },
      { key: 'approved', label: t('approved', 'Approved') },
      { key: 'rejected', label: t('rejected', 'Rejected') },
      { key: 'scheduled', label: t('scheduled', 'Scheduled') },
      { key: 'published', label: t('published', 'Published') },
    ].map((item) => ({ ...item, value: kpis[item.key] || 0 }));
  }, [data?.kpis, isTakkaAdmin, isOrgAdmin, t]);

  const goPostRequests = useCallback(
    (query?: string) => () => {
      router.push(query ? `/post-requests?${query}` : '/post-requests');
    },
    [router]
  );

  if (isLoading || !data) {
    return (
      <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[12px] lg:p-[20px] gap-[16px]">
        <div className="text-newTableText text-[14px]">
          {t('loading', 'Loading...')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[12px] lg:p-[20px] gap-[20px]">
      <div className="flex items-start justify-between gap-[12px] flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[24px] font-[600]">{title}</h1>
          <p className="text-newTableText text-[14px] mt-[4px]">{description}</p>
          {!!user?.name && (
            <p className="text-newTableText text-[13px] mt-[6px]">
              {t('welcome_back', 'Welcome back')}, {user.name}
              {user.lastName ? ` ${user.lastName}` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-[8px] flex-wrap">
          {isTakkaAdmin ? (
            <>
              <Button onClick={goPostRequests('status=REQUESTED')}>
                {t('review_requests', 'Review requests')}
              </Button>
              <Button secondary onClick={() => router.push('/organizations')}>
                {t('organizations', 'Organizations')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={goPostRequests()}>
                {t('new_post_request', 'New post request')}
              </Button>
              <Button secondary onClick={goPostRequests()}>
                {t('view_all', 'View all')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-[12px]">
        {kpiItems.map((item) => (
          <KpiCard key={item.key} label={item.label} value={item.value} />
        ))}
      </div>

      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px]">
          <div className="border border-newTableBorder rounded-[8px] p-[16px] flex flex-col gap-[10px]">
            <div className="text-[13px] uppercase tracking-wide text-newTableText">
              {t('connected_channels', 'Connected channels')}
            </div>
            <div className="text-[24px] font-[600]">
              {data.extras.channelsCount || 0}
            </div>
            <Button secondary onClick={() => router.push('/launches')}>
              {t('open_calendar', 'Open calendar')}
            </Button>
          </div>
          <div className="border border-newTableBorder rounded-[8px] p-[16px] flex flex-col gap-[10px]">
            <div className="text-[13px] uppercase tracking-wide text-newTableText">
              {t('queued_posts', 'Queued posts')}
            </div>
            <div className="text-[24px] font-[600]">
              {data.extras.queuedPosts || 0}
            </div>
            <Button secondary onClick={() => router.push('/analytics')}>
              {t('open_analytics', 'Open analytics')}
            </Button>
          </div>
          <div className="border border-newTableBorder rounded-[8px] p-[16px] flex flex-col gap-[10px]">
            <div className="text-[13px] uppercase tracking-wide text-newTableText">
              {t('media_library', 'Media library')}
            </div>
            <div className="text-[14px] text-newTableText">
              {t(
                'manage_media_assets',
                'Manage images and documents for your channels.'
              )}
            </div>
            <Button secondary onClick={() => router.push('/media')}>
              {t('open_media', 'Open media')}
            </Button>
          </div>
        </div>
      )}

      {isOrgAdmin && !isSuperAdmin && (
        <div className="border border-newTableBorder rounded-[8px] p-[16px] flex items-center justify-between gap-[12px] flex-wrap">
          <div>
            <div className="text-[16px] font-[500]">
              {t('team_members', 'Team members')}
            </div>
            <div className="text-[14px] text-newTableText mt-[4px]">
              {(data.extras.usersCount ?? data.kpis.users ?? 0)}{' '}
              {t('active_users', 'active users')}
            </div>
          </div>
          <Button secondary onClick={() => router.push('/settings')}>
            {t('manage_team', 'Manage team')}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-[16px]">
        <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
          <div className="flex items-center justify-between px-[14px] py-[12px] border-b border-newTableBorder bg-newTableHeader">
            <div className="text-[14px] font-[600]">
              {isTakkaAdmin
                ? t('to_review', 'To review')
                : isClientUser
                ? t('recent_requests', 'Recent requests')
                : t('recent_org_requests', 'Recent organization requests')}
            </div>
            <button
              type="button"
              className="text-[13px] text-textItemFocused cursor-pointer"
              onClick={goPostRequests(
                isTakkaAdmin ? 'status=REQUESTED' : undefined
              )}
            >
              {t('see_all', 'See all')}
            </button>
          </div>
          {!data.recent.length ? (
            <EmptyBlock
              text={t('no_recent_requests', 'No recent post requests.')}
            />
          ) : (
            data.recent.map((item) => (
              <RequestRow
                key={item.id}
                item={item}
                showOrg={isTakkaAdmin}
                onClick={goPostRequests()}
              />
            ))
          )}
        </div>

        <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
          <div className="flex items-center justify-between px-[14px] py-[12px] border-b border-newTableBorder bg-newTableHeader">
            <div className="text-[14px] font-[600]">
              {isTakkaAdmin
                ? t('top_organizations', 'Top organizations')
                : t('my_drafts', 'My drafts')}
            </div>
            {!isTakkaAdmin && (
              <button
                type="button"
                className="text-[13px] text-textItemFocused cursor-pointer"
                onClick={goPostRequests()}
              >
                {t('see_all', 'See all')}
              </button>
            )}
          </div>

          {isTakkaAdmin ? (
            !data.topOrganizations.length ? (
              <EmptyBlock
                text={t('no_organizations_activity', 'No organization activity yet.')}
              />
            ) : (
              data.topOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between gap-[12px] px-[14px] py-[12px] border-b border-newTableBorder last:border-b-0"
                >
                  <div className="text-[14px] font-[500] truncate min-w-0">
                    {org.name}
                  </div>
                  <div className="text-[13px] text-newTableText whitespace-nowrap">
                    {org.validatedCount} {t('validated', 'validated')}
                  </div>
                </div>
              ))
            )
          ) : !data.drafts.length ? (
            <EmptyBlock text={t('no_drafts', 'No drafts yet.')} />
          ) : (
            data.drafts.map((item) => (
              <RequestRow
                key={item.id}
                item={item}
                onClick={goPostRequests()}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

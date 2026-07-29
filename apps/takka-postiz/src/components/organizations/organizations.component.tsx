'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Pagination } from '@gitroom/takka-postiz/components/media/media.component';
import dayjs from 'dayjs';
import clsx from 'clsx';

type OrganizationRow = {
  id: string;
  name: string;
  createdAt: string;
  usersCount: number;
  postRequestsCount: number;
  approvedCount: number;
  rejectedCount: number;
  scheduledCount: number;
  publishedCount: number;
};

const rowGridClass =
  'grid-cols-[minmax(0,1.5fr)_90px_110px_110px_110px_110px_110px_120px]';

const useOrganizations = (page: number) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(`/organizations?page=${page + 1}`)).json();
  }, [fetch, page]);

  return useSWR<{
    results: OrganizationRow[];
    pages: number;
    total: number;
  }>(`takka-organizations-${page}`, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

export const OrganizationsComponent = () => {
  const t = useT();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useOrganizations(page);
  const results = data?.results || [];

  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[16px]">
      <div>
        <h1 className="text-[24px] font-[600]">
          {t('organizations', 'Organizations')}
        </h1>
        <p className="text-newTableText text-[14px] mt-[4px]">
          {t(
            'organizations_admin_description',
            'Overview of all client organizations and their post request activity.'
          )}
        </p>
      </div>

      <div className="border border-newTableBorder rounded-[8px] overflow-hidden overflow-x-auto">
        {isLoading && (
          <div className="px-[16px] py-[20px] text-newTableText text-[14px]">
            {t('loading', 'Loading...')}
          </div>
        )}
        {!isLoading && !results.length && (
          <div className="px-[16px] py-[32px] text-center text-newTableText text-[14px]">
            {t('no_organizations', 'No organizations yet.')}
          </div>
        )}
        {!!results.length && (
          <div className="min-w-[900px]">
            <div
              className={clsx(
                'grid gap-[12px] px-[16px] py-[14px] bg-newTableHeader border-b border-newTableBorder text-[13px] uppercase tracking-wide text-newTableText items-center',
                rowGridClass
              )}
            >
              <div>{t('name', 'Name')}</div>
              <div>{t('users', 'Users')}</div>
              <div>{t('requests', 'Requests')}</div>
              <div>{t('approved', 'Approved')}</div>
              <div>{t('rejected', 'Rejected')}</div>
              <div>{t('scheduled', 'Scheduled')}</div>
              <div>{t('published', 'Published')}</div>
              <div>{t('created', 'Created')}</div>
            </div>
            {results.map((org) => (
              <div
                key={org.id}
                className={clsx(
                  'grid gap-[12px] px-[16px] py-[16px] items-center border-b border-newTableBorder last:border-b-0 hover:bg-boxHover transition-colors',
                  rowGridClass
                )}
              >
                <div className="text-[16px] font-[500] truncate min-w-0">
                  {org.name}
                </div>
                <div className="text-[14px] text-newTableText">
                  {org.usersCount}
                </div>
                <div className="text-[14px] text-newTableText">
                  {org.postRequestsCount}
                </div>
                <div className="text-[14px] text-newTableText">
                  {org.approvedCount}
                </div>
                <div className="text-[14px] text-newTableText">
                  {org.rejectedCount}
                </div>
                <div className="text-[14px] text-newTableText">
                  {org.scheduledCount}
                </div>
                <div className="text-[14px] text-newTableText">
                  {org.publishedCount}
                </div>
                <div className="text-[14px] text-newTableText">
                  {dayjs(org.createdAt).format('MMM D, YYYY')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(data?.pages || 0) > 1 && (
        <Pagination
          current={page}
          totalPages={data?.pages || 1}
          setPage={setPage}
        />
      )}
    </div>
  );
};

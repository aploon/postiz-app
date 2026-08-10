'use client';

import Link from 'next/link';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const RequestsHubComponent = () => {
  const t = useT();

  return (
    <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[12px] lg:p-[20px] gap-[20px]">
      <div>
        <h1 className="text-[24px] font-[600]">{t('requests', 'Requests')}</h1>
        <p className="text-newTableText text-[14px] mt-[4px]">
          {t(
            'requests_hub_description',
            'Choose the type of request you want to manage.'
          )}
        </p>
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

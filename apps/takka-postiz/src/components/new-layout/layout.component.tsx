'use client';

import React, { ReactNode, useCallback, useState } from 'react';
import { Logo } from '@gitroom/takka-postiz/components/new-layout/logo';
import { Plus_Jakarta_Sans } from 'next/font/google';
const ModeComponent = dynamic(
  () => import('@gitroom/takka-postiz/components/layout/mode.component'),
  {
    ssr: false,
  }
);

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CheckPayment } from '@gitroom/takka-postiz/components/layout/check.payment';
import { ToolTip } from '@gitroom/takka-postiz/components/layout/top.tip';
import { ShowMediaBoxModal } from '@gitroom/takka-postiz/components/media/media.component';
import { ShowLinkedinCompany } from '@gitroom/takka-postiz/components/launches/helpers/linkedin.component';
import { MediaSettingsLayout } from '@gitroom/takka-postiz/components/launches/helpers/media.settings.component';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { ShowPostSelector } from '@gitroom/takka-postiz/components/post-url-selector/post.url.selector';
import { NewSubscription } from '@gitroom/takka-postiz/components/layout/new.subscription';
import { Support } from '@gitroom/takka-postiz/components/layout/support';
import { ContinueProvider } from '@gitroom/takka-postiz/components/layout/continue.provider';
import { ContextWrapper } from '@gitroom/takka-postiz/components/layout/user.context';
import { MantineWrapper } from '@gitroom/react/helpers/takka-postiz/mantine.wrapper';
import { Impersonate } from '@gitroom/takka-postiz/components/layout/impersonate';
import { AnnouncementBanner } from '@gitroom/takka-postiz/components/layout/announcement.banner';
import { Title } from '@gitroom/takka-postiz/components/layout/title';
import { TopMenu } from '@gitroom/takka-postiz/components/layout/top.menu';
import { RoleRouteGuard } from '@gitroom/takka-postiz/components/layout/role.route.guard';
import { LanguageComponent } from '@gitroom/takka-postiz/components/layout/language.component';
import { ChromeExtensionComponent } from '@gitroom/takka-postiz/components/layout/chrome.extension.component';
import NotificationComponent from '@gitroom/takka-postiz/components/notifications/notification.component';
import { OrganizationSelector } from '@gitroom/takka-postiz/components/layout/organization.selector';
import { StreakComponent } from '@gitroom/takka-postiz/components/layout/streak.component';
import { PreConditionComponent } from '@gitroom/takka-postiz/components/layout/pre-condition.component';
import { AttachToFeedbackIcon } from '@gitroom/takka-postiz/components/new-layout/sentry.feedback.component';
import { TrialTracker } from '@gitroom/takka-postiz/components/layout/gtm.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['600', '500', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  // Feedback icon component attaches Sentry feedback to a top-bar icon when DSN is present
  const searchParams = useSearchParams();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user, mutate } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  if (!user) return null;

  return (
    <ContextWrapper user={user}>
      <MantineWrapper>
        <RoleRouteGuard />
        <ToolTip />
        <Toaster />
        <TrialTracker />
        <CheckPayment check={searchParams.get('check') || ''} mutate={mutate}>
          <ShowMediaBoxModal />
          <ShowLinkedinCompany />
          <MediaSettingsLayout />
          <ShowPostSelector />
          <PreConditionComponent />
          <NewSubscription />
          <ContinueProvider />
          <div
            className={clsx(
              'flex flex-col min-h-screen w-full text-newTextColor p-[8px] lg:p-[12px]',
              jakartaSans.className
            )}
          >
            <div>{user?.admin ? <Impersonate /> : <div />}</div>
            <>
              <AnnouncementBanner />
              <div className="flex-1 flex gap-[8px]">
                <Support />
                {menuOpen && (
                  <div
                    className="fixed inset-0 z-[550] bg-black/60 lg:hidden"
                    onClick={() => setMenuOpen(false)}
                  />
                )}
                <div className="hidden lg:flex flex-col bg-newBgColorInner w-[80px] rounded-[12px]" />
                <div
                  id="left-menu"
                  onClick={() => setMenuOpen(false)}
                  className={clsx(
                    'fixed top-0 bottom-0 start-0 z-[600] w-[240px] overflow-y-auto bg-newBgColorInner px-[10px] flex flex-1',
                    'lg:z-auto lg:flex lg:w-[64px] lg:start-[17px] lg:px-0 lg:overflow-visible lg:bg-transparent',
                    !menuOpen && 'hidden',
                    user?.admin && 'pt-[60px]'
                  )}
                >
                  <div className="flex flex-col h-full gap-[32px] flex-1 py-[12px]">
                    <Logo />
                    <TopMenu />
                  </div>
                </div>
                <div className="flex-1 min-w-0 bg-newBgLineColor rounded-[12px] overflow-x-hidden overflow-y-auto lg:overflow-hidden flex flex-col gap-[1px] blurMe">
                  <div className="flex flex-col lg:flex-row bg-newBgColorInner lg:h-[80px] px-[12px] lg:px-[20px] py-[10px] lg:py-0 gap-[10px] lg:gap-0 lg:items-center">
                    <div className="text-[18px] lg:text-[24px] font-[600] flex flex-1 min-w-0 items-center gap-[10px]">
                      <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        aria-label={t('open_menu', 'Open menu')}
                        className="lg:hidden shrink-0 w-[36px] h-[36px] flex items-center justify-center rounded-[8px] text-textItemBlur hover:text-newTextColor hover:bg-boxFocused"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="22"
                          height="22"
                          viewBox="0 0 22 22"
                          fill="none"
                        >
                          <path
                            d="M3 5.5H19M3 11H19M3 16.5H19"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <div className="flex flex-1 min-w-0 truncate">
                        <Title />
                      </div>
                    </div>
                    <div className="flex gap-[14px] lg:gap-[20px] items-center text-textItemBlur overflow-x-auto lg:overflow-visible">
                      <StreakComponent />
                      <div className="shrink-0 w-[1px] h-[20px] bg-blockSeparator" />
                      <OrganizationSelector />
                      <div className="hover:text-newTextColor">
                        <ModeComponent />
                      </div>
                      <div className="shrink-0 w-[1px] h-[20px] bg-blockSeparator" />
                      <LanguageComponent />
                      <ChromeExtensionComponent />
                      <div className="shrink-0 w-[1px] h-[20px] bg-blockSeparator" />
                      <AttachToFeedbackIcon />
                      <NotificationComponent />
                    </div>
                  </div>
                  <div className="flex flex-col lg:flex-row flex-1 gap-[1px]">
                    {children}
                  </div>
                </div>
              </div>
            </>
          </div>
        </CheckPayment>
      </MantineWrapper>
    </ContextWrapper>
  );
};

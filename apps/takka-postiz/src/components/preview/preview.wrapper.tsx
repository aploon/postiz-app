'use client';

import useSWR from 'swr';
import { ContextWrapper } from '@gitroom/takka-postiz/components/layout/user.context';
import { ReactNode, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { MantineWrapper } from '@gitroom/react/helpers/takka-postiz/mantine.wrapper';
import { ToolTip } from '@gitroom/takka-postiz/components/layout/top.tip';

export const PreviewWrapper = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });
  return (
    <ContextWrapper user={user}>
      <MantineWrapper>
        <Toaster />
        <ToolTip />
        {children}
      </MantineWrapper>
    </ContextWrapper>
  );
};

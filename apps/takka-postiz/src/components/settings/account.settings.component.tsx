'use client';

import React, { useCallback, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/takka-postiz/components/layout/user.context';

type PersonalInfo = {
  id: string;
  email: string;
  name?: string | null;
  lastName?: string | null;
  bio?: string | null;
  providerName?: string;
  organization?: { id: string; name: string } | null;
};

const usePersonalInfo = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/user/personal')).json();
  }, [fetch]);

  return useSWR<PersonalInfo>('user-personal', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

export const AccountSettingsComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const user = useUser();
  const { data, mutate, isLoading } = usePersonalInfo();
  const canEditOrg = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const isLocal = data?.providerName === 'LOCAL';

  const profileForm = useForm({
    values: {
      name: data?.name || '',
      lastName: data?.lastName || '',
      email: data?.email || '',
      organizationName: data?.organization?.name || '',
    },
  });

  const passwordForm = useForm({
    values: {
      currentPassword: '',
      password: '',
      repeatPassword: '',
    },
  });

  useEffect(() => {
    if (data) {
      profileForm.reset({
        name: data.name || '',
        lastName: data.lastName || '',
        email: data.email || '',
        organizationName: data.organization?.name || '',
      });
    }
  }, [data]);

  const saveProfile = useCallback(
    async (values: {
      name: string;
      lastName: string;
      organizationName: string;
    }) => {
      const personalResponse = await fetch('/user/personal', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          lastName: values.lastName,
        }),
      });

      if (!personalResponse.ok) {
        toaster.show(
          t('profile_update_failed', 'Failed to update profile'),
          'warning'
        );
        return;
      }

      if (
        canEditOrg &&
        values.organizationName &&
        values.organizationName !== data?.organization?.name
      ) {
        const orgResponse = await fetch('/settings/organization', {
          method: 'POST',
          body: JSON.stringify({ name: values.organizationName }),
        });
        if (!orgResponse.ok) {
          toaster.show(
            t('organization_update_failed', 'Failed to update organization'),
            'warning'
          );
          return;
        }
      }

      toaster.show(t('profile_updated', 'Profile updated'), 'success');
      mutate();
    },
    [canEditOrg, data?.organization?.name, fetch, mutate, t, toaster]
  );

  const changePassword = useCallback(
    async (values: {
      currentPassword: string;
      password: string;
      repeatPassword: string;
    }) => {
      if (values.password !== values.repeatPassword) {
        toaster.show(
          t('passwords_do_not_match', 'Passwords do not match'),
          'warning'
        );
        return;
      }

      const response = await fetch('/user/change-password', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        toaster.show(
          err?.message ||
            t('password_update_failed', 'Failed to update password'),
          'warning'
        );
        return;
      }

      toaster.show(t('password_updated', 'Password updated'), 'success');
      passwordForm.reset({
        currentPassword: '',
        password: '',
        repeatPassword: '',
      });
    },
    [fetch, passwordForm, t, toaster]
  );

  if (isLoading) {
    return (
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
        <div className="animate-pulse">{t('loading', 'Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">{t('account', 'Account')}</div>
      <FormProvider {...profileForm}>
        <form
          onSubmit={profileForm.handleSubmit(saveProfile)}
          className="flex flex-col gap-[8px]"
        >
          <Input
            name="organizationName"
            label={t('organization_name', 'Organization name')}
            disabled={!canEditOrg}
          />
          <Input name="name" label={t('first_name', 'First name')} />
          <Input name="lastName" label={t('last_name', 'Last name')} />
          <Input
            name="email"
            label={t('email', 'Email')}
            disabled={true}
          />
          <div className="flex justify-end">
            <Button type="submit">{t('save', 'Save')}</Button>
          </div>
        </form>
      </FormProvider>

      {isLocal && (
        <>
          <div className="border-t border-fifth pt-[16px] mt-[8px]">
            {t('change_password', 'Change password')}
          </div>
          <FormProvider {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(changePassword)}
              className="flex flex-col gap-[8px]"
            >
              <Input
                name="currentPassword"
                type="password"
                label={t('current_password', 'Current password')}
              />
              <Input
                name="password"
                type="password"
                label={t('new_password', 'New password')}
              />
              <Input
                name="repeatPassword"
                type="password"
                label={t('repeat_password', 'Repeat password')}
              />
              <div className="flex justify-end">
                <Button type="submit">
                  {t('update_password', 'Update password')}
                </Button>
              </div>
            </form>
          </FormProvider>
        </>
      )}
    </div>
  );
};

export default AccountSettingsComponent;

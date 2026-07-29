'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { RegisterTakkaAdminDto } from '@gitroom/nestjs-libraries/dtos/auth/register.takka.admin.dto';
import { useRouter } from 'next/navigation';
import { useFireEvents } from '@gitroom/helpers/utils/takka-postiz/use.fire.events';
import { useTrack } from '@gitroom/react/helpers/takka-postiz/use.track';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';
import { Provider } from '@prisma/client';

type Inputs = {
  email: string;
  password: string;
  provider: Provider;
};

export function RegisterTakkaAdmin() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const fireEvents = useFireEvents();
  const track = useTrack();
  const [datafast_visitor_id] = useCookie('datafast_visitor_id');
  const resolver = useMemo(() => {
    return classValidatorResolver(RegisterTakkaAdminDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
    defaultValues: {
      provider: Provider.LOCAL,
    },
  });
  const fetchData = useFetch();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    await fetchData('/auth/register-takka-admin', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        provider: Provider.LOCAL,
        datafast_visitor_id,
      }),
    })
      .then(async (response) => {
        setLoading(false);
        if (response.status === 200) {
          fireEvents('register');
          return track(TrackEnum.CompleteRegistration).then(() => {
            if (response.headers.get('activate') === 'true') {
              router.push('/auth/activate');
            } else {
              router.push('/auth/login');
            }
          });
        } else {
          form.setError('email', {
            message: await response.text(),
          });
        }
      })
      .catch((e) => {
        form.setError('email', {
          message:
            'General error: ' +
            e.toString() +
            '. Please check your browser console.',
        });
      });
  };

  return (
    <FormProvider {...form}>
      <form className="flex-1 flex" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col flex-1">
          <div>
            <h1 className="text-[40px] font-[500] -tracking-[0.8px] text-start cursor-pointer">
              {t('takka_admin_sign_up', 'Takka Admin Sign Up')}
            </h1>
          </div>
          <div className="flex flex-col gap-[12px] mt-[32px]">
            <div className="text-textColor">
              <Input
                label="Email"
                translationKey="label_email"
                {...form.register('email')}
                type="email"
                placeholder={t('email_address', 'Email Address')}
              />
              <Input
                label="Password"
                translationKey="label_password"
                {...form.register('password')}
                autoComplete="off"
                type="password"
                placeholder={t('label_password', 'Password')}
              />
            </div>
            <div className="text-center mt-6">
              <div className="w-full flex">
                <Button
                  type="submit"
                  className="flex-1 rounded-[10px] !h-[52px]"
                  loading={loading}
                >
                  {t('create_account', 'Create Account')}
                </Button>
              </div>
              <p className="mt-4 text-sm">
                {t('already_have_an_account', 'Already Have An Account?')}
                &nbsp;
                <Link href="/auth/login" className="underline cursor-pointer">
                  {t('sign_in', 'Sign In')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

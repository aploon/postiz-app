'use client';

import { FC, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@gitroom/takka-postiz/components/layout/user.context';

const SUPERADMIN_ONLY_PREFIXES = ['/launches', '/analytics'];
const ADMIN_AND_SUPERADMIN_PREFIXES = ['/media'];
const TAKKA_ADMIN_ONLY_PREFIXES = ['/organizations'];

export const RoleRouteGuard: FC = () => {
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user || !pathname) {
      return;
    }

    const isTakkaAdmin = user.isTakkaAdmin === true;
    const role = user.role;

    const isTakkaAdminOnly = TAKKA_ADMIN_ONLY_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (isTakkaAdminOnly && !isTakkaAdmin) {
      router.replace('/dashboard');
      return;
    }

    const isAdminMedia = ADMIN_AND_SUPERADMIN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (
      isAdminMedia &&
      (isTakkaAdmin || (role !== 'ADMIN' && role !== 'SUPERADMIN'))
    ) {
      router.replace('/dashboard');
      return;
    }

    const isSocialOnly = SUPERADMIN_ONLY_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (isSocialOnly && (isTakkaAdmin || role !== 'SUPERADMIN')) {
      router.replace('/dashboard');
    }
  }, [user, pathname, router]);

  return null;
};

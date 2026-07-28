'use client';

import { FC, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@gitroom/takka-postiz/components/layout/user.context';

const SUPERADMIN_ONLY_PREFIXES = ['/launches', '/analytics', '/media'];

export const RoleRouteGuard: FC = () => {
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user?.role || !pathname) {
      return;
    }

    if (user.role === 'SUPERADMIN') {
      return;
    }

    const blocked = SUPERADMIN_ONLY_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (blocked) {
      router.replace('/dashboard');
    }
  }, [user?.role, pathname, router]);

  return null;
};

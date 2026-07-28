import { RegisterTakkaAdmin } from '@gitroom/takka-postiz/components/auth/register.takka.admin';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Takka Admin Register`,
  description: '',
};

export default async function TakkaAdminAuth() {
  return <RegisterTakkaAdmin />;
}

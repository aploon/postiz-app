import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Takka Admin Register`,
  description: '',
};

export default async function TakkaAdminAuth() {
  redirect('/auth/login');
}

export const dynamic = 'force-dynamic';
import { Login } from '@gitroom/takka-postiz/components/auth/login';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: `Takka Login`,
  description: '',
};
export default async function Auth() {
  return <Login />;
}

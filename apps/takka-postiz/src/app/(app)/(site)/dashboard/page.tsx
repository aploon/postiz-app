export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { DashboardComponent } from '@gitroom/takka-postiz/components/dashboard/dashboard.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Takka' : 'Gitroom'} Dashboard`,
  description: '',
};

export default async function Page() {
  return <DashboardComponent />;
}

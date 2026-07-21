export const dynamic = 'force-dynamic';
import { LaunchesComponent } from '@gitroom/takka-postiz/components/launches/launches.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz Calendar' : 'Gitroom Launches'}`,
  description: '',
};
export default async function Index() {
  return <LaunchesComponent />;
}

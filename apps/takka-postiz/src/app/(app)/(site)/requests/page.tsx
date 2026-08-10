export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { RequestsHubComponent } from '@gitroom/takka-postiz/components/requests/requests.hub.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Takka' : 'Gitroom'} Requests`,
  description: '',
};

export default async function Page() {
  return <RequestsHubComponent />;
}

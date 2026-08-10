export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { OtherRequestsComponent } from '@gitroom/takka-postiz/components/other-requests/other-requests.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Takka' : 'Gitroom'} Other Requests`,
  description: '',
};

export default async function Page() {
  return <OtherRequestsComponent />;
}

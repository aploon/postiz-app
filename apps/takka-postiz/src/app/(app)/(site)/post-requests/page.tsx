export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { PostRequestsComponent } from '@gitroom/takka-postiz/components/post-requests/post-requests.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Takka' : 'Gitroom'} Post Requests`,
  description: '',
};

export default async function Page() {
  return <PostRequestsComponent />;
}

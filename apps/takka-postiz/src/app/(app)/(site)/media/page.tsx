import { MediaLayoutComponent } from '@gitroom/takka-postiz/components/new-layout/layout.media.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Media`,
  description: '',
};

export default async function Page() {
  return <MediaLayoutComponent />
}

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { PostRequestCategoriesComponent } from '@gitroom/takka-postiz/components/post-request-categories/post-request-categories.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Takka' : 'Gitroom'} Post Request Categories`,
  description: '',
};

export default async function Page() {
  return <PostRequestCategoriesComponent />;
}

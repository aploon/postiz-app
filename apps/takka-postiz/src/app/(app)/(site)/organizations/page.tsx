export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { OrganizationsComponent } from '@gitroom/takka-postiz/components/organizations/organizations.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Takka' : 'Gitroom'} Organizations`,
  description: '',
};

export default async function Page() {
  return <OrganizationsComponent />;
}

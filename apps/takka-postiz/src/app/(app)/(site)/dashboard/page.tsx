export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Takka' : 'Gitroom'} Dashboard`,
  description: '',
};

export default async function Page() {
  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
      <h1 className="text-[24px] font-[600]">Dashboard</h1>
      <p className="text-customColor18 text-[14px]">
        Your dashboard will be available here soon.
      </p>
    </div>
  );
}

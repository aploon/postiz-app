import { ReactNode } from 'react';
import { PreviewWrapper } from '@gitroom/takka-postiz/components/preview/preview.wrapper';

export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#000000] min-h-screen">
      <PreviewWrapper>{children}</PreviewWrapper>
    </div>
  );
}

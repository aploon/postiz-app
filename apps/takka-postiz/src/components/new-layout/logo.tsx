'use client';

import Image from 'next/image';

export const Logo = () => {
  return (
    <div
      className="mt-[8px] min-w-[60px] min-h-[60px] flex items-center justify-center"
      title="Takka"
    >
      <Image
        src="/logo.png"
        alt="Takka"
        width={60}
        height={53}
        className="object-contain"
        priority
      />
    </div>
  );
};

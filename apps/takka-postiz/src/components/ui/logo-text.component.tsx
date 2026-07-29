import React from 'react';
import Image from 'next/image';

export const LogoTextComponent = () => {
  return (
    <div className="flex items-center gap-3" title="Takka">
      <Image
        src="/logo.png"
        alt="Takkatech"
        width={40}
        height={35}
        className="object-contain"
        priority
      />
      <span className="text-[22px] font-[700] tracking-tight text-newTextColor">
        Takkatech
      </span>
    </div>
  );
};

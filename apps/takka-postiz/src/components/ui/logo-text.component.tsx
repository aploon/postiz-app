'use client';

import React from 'react';
import Image from 'next/image';

export const LogoTextComponent = () => {
  return (
    <div className="flex items-center gap-3" title="Takka">
      <button
        type="button"
        className="cursor-default border-0 bg-transparent p-0"
        aria-label="Takkatech"
      >
        <Image
          src="/logo.png"
          alt="Takkatech"
          width={40}
          height={35}
          className="object-contain"
          priority
        />
      </button>
      <span className="text-[22px] font-[700] tracking-tight text-newTextColor">
        Takkatech
      </span>
    </div>
  );
};

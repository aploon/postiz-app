'use client';

import React, { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const TAKKA_ADMIN_CLICKS = 7;
const CLICK_RESET_MS = 2500;

export const LogoTextComponent = () => {
  const router = useRouter();
  const [clicks, setClicks] = useState(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLogoClick = useCallback(() => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }

    const next = clicks + 1;
    if (next >= TAKKA_ADMIN_CLICKS) {
      setClicks(0);
      router.push('/auth/takka-admin');
      return;
    }

    setClicks(next);
    resetTimer.current = setTimeout(() => setClicks(0), CLICK_RESET_MS);
  }, [clicks, router]);

  return (
    <div className="flex items-center gap-3" title="Takka">
      <button
        type="button"
        onClick={onLogoClick}
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

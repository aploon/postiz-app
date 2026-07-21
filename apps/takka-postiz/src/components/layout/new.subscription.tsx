import { useSearchParams } from 'next/navigation';
import { FC, useEffect } from 'react';
import { useFireEvents } from '@gitroom/helpers/utils/takka-postiz/use.fire.events';
export const NewSubscription: FC = () => {
  const query = useSearchParams();
  const fireEvents = useFireEvents();
  useEffect(() => {
    const check = query.get('check');
    if (check) {
      fireEvents('purchase');
    }
  }, [query]);
  return null;
};

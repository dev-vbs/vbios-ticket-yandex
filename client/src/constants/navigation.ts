import { IconHeadset, IconServer, IconSparkles, IconUser } from '@tabler/icons-react';

export const NAV_ITEMS = [
  { path: '/', labelKey: 'nav.home', icon: IconSparkles },
  { path: '/services', labelKey: 'nav.services', icon: IconServer },
  { path: '/tickets', labelKey: 'nav.tickets', icon: IconHeadset },
  { path: '/profile', labelKey: 'profile.title', icon: IconUser },
] as const;

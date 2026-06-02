import {
  LayoutGrid,
  Lightbulb,
  BookOpen,
  Calendar,
  Newspaper,
  Globe,
  LineChart,
  Link2,
  Zap,
  Settings,
} from 'lucide-react';

/** Single MRKT-style nav — same on home and all dashboard routes */
export const MRKT_NAV_SECTIONS = [
  {
    label: 'Desk',
    items: [
      { name: 'Home', path: '/dashboard', icon: LayoutGrid, exact: true },
      { name: 'Ideas', path: '/dashboard/ideas', icon: Lightbulb },
      { name: 'Journal', path: '/dashboard/journal', icon: BookOpen },
    ],
  },
  {
    label: 'Intel',
    items: [
      { name: 'Calendar', path: '/dashboard/calendar', icon: Calendar },
      { name: 'News', path: '/dashboard/news', icon: Newspaper },
      { name: 'Markets', path: '/dashboard/economy', icon: Globe },
    ],
  },
  {
    label: 'Tools',
    items: [
      { name: 'Backtest', path: '/dashboard/backtest', icon: LineChart, pro: true },
      { name: 'Connections', path: '/dashboard/connections', icon: Link2 },
    ],
  },
];

export const MRKT_NAV_ITEMS = MRKT_NAV_SECTIONS.flatMap((s) => s.items);

export const MRKT_NAV_FOOTER = [
  { name: 'Plans', path: '/dashboard/pricing', icon: Zap },
  { name: 'Settings', path: '/dashboard/settings', icon: Settings },
];

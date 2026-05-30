import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LayoutProvider, useLayout } from '../context/LayoutContext.jsx';
import { hasPaidAccess } from '../utils/entitlements.js';
import { api } from '../services/api/api.js';
import AIChatWidget from '../components/widgets/AIChatWidget';
import ApiStatusBar from '../components/layout/ApiStatusBar.jsx';
import NotificationBell from '../components/layout/NotificationBell.jsx';
import BrandLogo from '../components/brand/BrandLogo';
import {
  LayoutDashboard,
  Lightbulb,
  Calendar,
  Newspaper,
  LineChart,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Radio,
  Link2,
  Zap,
  Globe,
} from 'lucide-react';

const navSections = [
  {
    label: 'Trade',
    items: [
      { name: 'Overview', path: '/dashboard', icon: LayoutDashboard, exact: true },
      { name: 'Ideas', path: '/dashboard/ideas', icon: Lightbulb },
      { name: 'Journal', path: '/dashboard/journal', icon: BookOpen },
    ],
  },
  {
    label: 'Intel',
    items: [
      { name: 'Calendar', path: '/dashboard/calendar', icon: Calendar },
      { name: 'News', path: '/dashboard/news', icon: Newspaper },
      { name: 'Economy', path: '/dashboard/economy', icon: Globe },
    ],
  },
  {
    label: 'Tools',
    items: [
      { name: 'Connections', path: '/dashboard/connections', icon: Link2 },
      { name: 'Backtest', path: '/dashboard/backtest', icon: LineChart, pro: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Plans', path: '/dashboard/pricing', icon: Zap },
      { name: 'Settings', path: '/dashboard/settings', icon: Settings },
    ],
  },
];

const navItems = navSections.flatMap((s) => s.items);

const mobilePrimaryItems = [
  navSections[0].items[0],
  navSections[0].items[1],
  navSections[0].items[2],
];

const mobileMoreSections = navSections
  .map((section) => ({
    ...section,
    items: section.label === 'Trade' ? section.items.slice(3) : section.items,
  }))
  .filter((section) => section.items.length > 0);

const DashboardLayoutInner = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed, setIsCollapsed, chartMode } = useLayout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.system.getHealth();
        setApiOnline(!!res?.success);
      } catch {
        setApiOnline(false);
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const tierLabel = hasPaidAccess(user)
    ? (user?.tier || 'free').toUpperCase()
    : 'FREE';
  const activePage = navItems.find((item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  return (
    <div className={`dash-shell selection:bg-primary/30 ${chartMode ? 'dash-shell--chart-mode' : ''}`}>
      <div className="dash-shell__ambient" aria-hidden="true" />

      <aside
        className={`dash-sidebar ${isCollapsed ? 'dash-sidebar--collapsed' : ''}`}
      >
        <div className={`dash-sidebar__head ${isCollapsed ? 'justify-center px-2' : 'justify-between'}`}>
          <Link to="/dashboard" className="min-w-0 overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <BrandLogo size={isCollapsed ? 'sm' : 'md'} showText={!isCollapsed} showTagline={!isCollapsed} />
          </Link>
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-hover border border-transparent hover:border-border/60 transition-all"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="mx-auto mt-2 p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {!isCollapsed && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-background/50">
              <Sparkles size={14} className="text-primary shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Plan</span>
              <span
                className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  tierLabel !== 'FREE'
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-surface-hover text-text-muted border border-border'
                }`}
              >
                {tierLabel}
              </span>
            </div>
          </div>
        )}

        <nav className="dash-sidebar__nav" aria-label="Dashboard">
          {navSections.map((section) => (
            <div key={section.label} className={isCollapsed ? 'mb-1' : 'mb-3'}>
              {!isCollapsed && (
                <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-widest text-text-muted/70">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);
                const locked = item.pro && !hasPaidAccess(user);

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    title={isCollapsed ? item.name : undefined}
                    className={`nav-item ${isActive ? 'nav-item-active' : 'text-text-muted'} ${
                      isCollapsed ? 'justify-center px-2' : ''
                    }`}
                  >
                    <item.icon size={20} className={`shrink-0 ${isActive ? 'text-primary' : ''}`} />
                    {!isCollapsed && (
                      <span className="whitespace-nowrap flex items-center gap-2">
                        {item.name}
                        {locked && (
                          <span className="text-[8px] font-bold uppercase text-text-muted border border-border px-1 rounded">
                            Pro
                          </span>
                        )}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="dash-sidebar__foot">
          <button
            type="button"
            onClick={handleLogout}
            className={`nav-item w-full text-danger hover:bg-danger/10 hover:border-danger/20 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Log out' : undefined}
          >
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="md:hidden h-[72px] glass-panel border-x-0 border-t-0 rounded-none flex items-center justify-between px-4 z-20 shrink-0 gap-2">
          <BrandLogo size="sm" linkTo="/dashboard" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border ${
              tierLabel !== 'FREE' ? 'bg-primary/15 text-primary border-primary/30' : 'bg-surface-hover text-text-muted'
            }`}
          >
            {tierLabel}
          </span>
          </div>
        </header>

        <div className="dash-topbar">
          <div className="min-w-0">
            <p className="dash-topbar__meta">Command center</p>
            <h1 className="dash-topbar__title">{activePage?.name || 'Overview'}</h1>
          </div>
          <div className="dash-topbar__actions">
            <NotificationBell />
            <span
              className={`dash-status-pill ${apiOnline ? 'dash-status-pill--live' : 'border-amber-500/40 text-amber-300'}`}
              title={apiOnline ? 'API connected' : 'Run npm run dev:all'}
            >
              <Radio size={12} aria-hidden="true" />
              {apiOnline ? 'Markets live' : 'API offline'}
            </span>
            <span className="hidden lg:inline text-sm font-bold text-text-muted truncate max-w-[140px]">
              {user?.name || user?.email}
            </span>
          </div>
        </div>

        <main className="dash-content">
          <div className="max-w-[1600px] mx-auto w-full space-y-4">
            <ApiStatusBar />
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="dash-mobile-bar md:hidden" aria-label="Mobile navigation">
        <div className="dash-mobile-bar__inner">
          {mobilePrimaryItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all ${
                  isActive ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <span className={`p-1.5 rounded-xl ${isActive ? 'bg-primary/15' : ''}`}>
                  <item.icon size={20} />
                </span>
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 ${
              mobileMenuOpen || mobileMoreSections.some((s) =>
                s.items.some((item) =>
                  item.exact
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path),
                ),
              )
                ? 'text-primary'
                : 'text-text-muted'
            }`}
          >
            <span
              className={`p-1.5 rounded-xl ${
                mobileMenuOpen ||
                mobileMoreSections.some((s) =>
                  s.items.some((item) =>
                    item.exact
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path),
                  ),
                )
                  ? 'bg-primary/15'
                  : ''
              }`}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </span>
            <span className="text-[10px] font-bold">More</span>
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bottom-20 z-40 animate-fade-in">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
          <div className="absolute inset-x-4 top-2 bottom-2 dash-panel p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            {mobileMoreSections.map((section) => (
              <div key={section.label}>
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-2">
                  {section.label}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = item.exact
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path);
                    const locked = item.pro && !hasPaidAccess(user);
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                      >
                        <item.icon size={20} />
                        <span className="flex items-center gap-2">
                          {item.name}
                          {locked && (
                            <span className="text-[8px] font-bold uppercase text-text-muted border border-border px-1 rounded">
                              Pro
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <button type="button" onClick={handleLogout} className="nav-item w-full mt-auto text-danger">
              <LogOut size={20} />
              Log out
            </button>
          </div>
        </div>
      )}

      <div className="hidden md:block">
        <AIChatWidget />
      </div>
    </div>
  );
};

const DashboardLayout = () => (
  <LayoutProvider>
    <DashboardLayoutInner />
  </LayoutProvider>
);

export default DashboardLayout;

import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LayoutProvider, useLayout } from '../context/LayoutContext.jsx';
import { hasPaidAccess } from '../utils/entitlements.js';
import { api } from '../services/api/api.js';
import AIChatWidget from '../components/widgets/AIChatWidget';
import ApiStatusBar from '../components/layout/ApiStatusBar.jsx';
import NotificationBell from '../components/layout/NotificationBell.jsx';
import MrktSidebar from '../components/layout/MrktSidebar.jsx';
import BrandLogo from '../components/brand/BrandLogo';
import { LogOut, Menu, X } from 'lucide-react';
import { MRKT_NAV_ITEMS, MRKT_NAV_SECTIONS } from '../config/mrktNav.js';

const mobilePrimaryItems = MRKT_NAV_SECTIONS[0].items.slice(0, 3);

const DashboardLayoutInner = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { chartExpanded, newsOpen } = useLayout();
  const isTerminalHome = location.pathname === '/dashboard';
  const isPricing = location.pathname === '/dashboard/pricing';
  const hideChromeTopbar = isTerminalHome;
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

  const activePage =
    MRKT_NAV_ITEMS.find((item) =>
      item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path),
    ) ||
  (isPricing ? { name: 'Plans' } : null);

  return (
    <>
    <div
      className={`dash-shell dash-shell--mrkt selection:bg-primary/30 ${
        isTerminalHome ? 'dash-shell--terminal-home' : ''
      } ${isTerminalHome && !newsOpen ? 'dash-shell--news-hidden' : ''} ${
        chartExpanded ? 'dash-shell--chart-mode dash-shell--chart-expanded' : ''
      }`}
    >
      <div className="dash-shell__ambient" aria-hidden="true" />

      <MrktSidebar user={user} onLogout={handleLogout} />

      <div className="dash-main dash-main--mrkt-offset">
        <header className="md:hidden h-[72px] glass-panel border-x-0 border-t-0 rounded-none flex items-center justify-between px-4 z-20 shrink-0 gap-2">
          <BrandLogo size="sm" linkTo="/dashboard" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              to="/dashboard/pricing"
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border ${
                tierLabel !== 'FREE'
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-surface-hover text-text-muted border-border'
              }`}
            >
              {tierLabel}
            </Link>
          </div>
        </header>

        {!hideChromeTopbar && (
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
                {apiOnline ? 'Markets live' : 'API offline'}
              </span>
              <span className="hidden lg:inline text-sm font-bold text-text-muted truncate max-w-[140px]">
                {user?.name || user?.email}
              </span>
            </div>
          </div>
        )}

        <main className={`dash-content ${isTerminalHome ? 'dash-content--terminal' : ''}`}>
          <div className={`max-w-[1600px] mx-auto w-full ${isTerminalHome ? 'h-full' : 'space-y-4'}`}>
            {!isTerminalHome && !isPricing && <ApiStatusBar />}
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
              mobileMenuOpen ? 'text-primary' : 'text-text-muted'
            }`}
          >
            <span className={`p-1.5 rounded-xl ${mobileMenuOpen ? 'bg-primary/15' : ''}`}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </span>
            <span className="text-[10px] font-bold">More</span>
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bottom-20 z-40 animate-fade-in">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-4 top-2 bottom-2 dash-panel p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            {MRKT_NAV_SECTIONS.map((section) => (
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
            <div>
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-2">
                Account
              </h3>
              <div className="space-y-1">
                <Link
                  to="/dashboard/pricing"
                  className={`nav-item ${isPricing ? 'nav-item-active' : ''}`}
                >
                  Plans
                </Link>
                <Link
                  to="/dashboard/settings"
                  className={`nav-item ${location.pathname.startsWith('/dashboard/settings') ? 'nav-item-active' : ''}`}
                >
                  Settings
                </Link>
              </div>
            </div>
            <button type="button" onClick={handleLogout} className="nav-item w-full mt-auto text-danger">
              <LogOut size={20} />
              Log out
            </button>
          </div>
        </div>
      )}

    </div>

    {/* Outside dash-shell so overflow:hidden does not clip the FAB */}
    <div className="mrkt-chat-anchor" aria-label="Insidr chat">
      <AIChatWidget />
    </div>
    </>
  );
};

const DashboardLayout = () => (
  <LayoutProvider>
    <DashboardLayoutInner />
  </LayoutProvider>
);

export default DashboardLayout;

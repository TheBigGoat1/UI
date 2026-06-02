import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import BrandLogo from '../brand/BrandLogo';
import { hasPaidAccess } from '../../utils/entitlements.js';
import { MRKT_NAV_SECTIONS, MRKT_NAV_FOOTER } from '../../config/mrktNav.js';

const MrktSidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const tier = (user?.tier || 'free').toLowerCase();

  const userInitials = (user?.name || user?.email || 'U')
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'U';

  const isActive = (item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  return (
    <aside className="dash-sidebar dash-sidebar--hover-expand" aria-label="Main navigation">
      <div className="dash-sidebar__head">
        <Link
          to="/dashboard"
          className="dash-sidebar__brand flex items-center gap-2 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/40 rounded-lg"
          title="Home"
        >
          <BrandLogo size="sm" showText={false} />
          <span className="dash-sidebar__brand-text">Insidr</span>
        </Link>
      </div>

      <nav className="dash-sidebar__nav">
        {MRKT_NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mrkt-nav-section">
            <p className="nav-section-label">{section.label}</p>
            {section.items.map((item) => {
              const active = isActive(item);
              const locked = item.pro && !hasPaidAccess(user);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.name}
                  className={`nav-item ${active ? 'nav-item-active' : 'text-text-muted'}`}
                >
                  <item.icon size={20} className={`shrink-0 ${active ? 'text-[#8b5cf6]' : ''}`} />
                  <span className="nav-item__label">
                    {item.name}
                    {locked && <span className="mrkt-nav-pro-tag">Pro</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="dash-sidebar__foot">
        <div className="mrkt-sidebar-tier">
          <span className={`mrkt-sidebar-tier__pill mrkt-sidebar-tier__pill--${tier}`}>
            {tier}
          </span>
          <span className="nav-item__label mrkt-sidebar-tier__hint text-text-muted text-[10px]">
            Plan tier
          </span>
        </div>

        {MRKT_NAV_FOOTER.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.name}
              className={`nav-item ${active ? 'nav-item-active' : 'text-text-muted'}`}
            >
              <item.icon size={20} className={`shrink-0 ${active ? 'text-[#8b5cf6]' : ''}`} />
              <span className="nav-item__label">{item.name}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onLogout}
          className="nav-item w-full text-text-muted hover:text-danger hover:bg-danger/10"
          title="Log out"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="nav-item__label">Log out</span>
        </button>

        <Link
          to="/dashboard/settings"
          className="mrkt-rail-avatar mrkt-sidebar-avatar"
          title={user?.name || user?.email || 'Account'}
        >
          {userInitials}
        </Link>
      </div>
    </aside>
  );
};

export default MrktSidebar;

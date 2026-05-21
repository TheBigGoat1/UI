import React from 'react';

const PageHeader = ({ icon: Icon, title, description, action, badge }) => (
  <header className="dash-page-header">
    <div className="flex gap-4 min-w-0 flex-1">
      {Icon && (
        <span className="dash-page-header__icon">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="dash-page-header__title">{title}</h1>
          {badge}
        </div>
        {description && <p className="dash-page-header__desc">{description}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

export default PageHeader;

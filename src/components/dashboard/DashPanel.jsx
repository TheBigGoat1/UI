import React from 'react';

const DashPanel = ({ title, icon: Icon, action, children, className = '', bodyClassName = '' }) => (
  <section className={`dash-panel ${className}`}>
    {(title || action) && (
      <div className="dash-panel__head">
        {title && (
          <h3 className="dash-panel__title">
            {Icon && <Icon size={18} className="text-primary" aria-hidden="true" />}
            {title}
          </h3>
        )}
        {action}
      </div>
    )}
    <div className={`dash-panel__body ${bodyClassName}`}>{children}</div>
  </section>
);

export default DashPanel;

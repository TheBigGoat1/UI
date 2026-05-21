import React from 'react';

const DashStat = ({ label, value, sub, icon: Icon, tone = 'default', className = '' }) => {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'primary'
          ? 'text-primary'
          : 'text-text-main';

  return (
    <article className={`dash-stat ${className}`}>
      <p className="dash-stat__label">
        {Icon && <Icon size={14} className="text-primary shrink-0" aria-hidden="true" />}
        {label}
      </p>
      <p className={`dash-stat__value ${toneClass}`}>{value}</p>
      {sub && <p className="dash-stat__sub">{sub}</p>}
    </article>
  );
};

export default DashStat;

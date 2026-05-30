import React from 'react';

const AuthField = ({ id, label, icon: Icon, children, className = '' }) => (
  <label className={`auth-field ${className}`} htmlFor={id}>
    <span className="auth-field__label">{label}</span>
    <div className="auth-field__wrap">
      {Icon && <Icon size={16} className="auth-field__icon" aria-hidden />}
      {children}
    </div>
  </label>
);

export default AuthField;

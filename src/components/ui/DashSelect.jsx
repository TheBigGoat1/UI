import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * High-contrast native select for dark dashboard UI (Windows-friendly).
 */
const DashSelect = ({
  label,
  value,
  onChange,
  options = [],
  children,
  className = '',
  wrapperClassName = '',
  id,
  disabled = false,
  hint,
  ...rest
}) => {
  const selectId = id || (label ? `dash-select-${String(label).replace(/\s/g, '-')}` : undefined);

  return (
    <div className={`dash-field ${wrapperClassName}`}>
      {label && (
        <label htmlFor={selectId} className="dash-field__label">
          {label}
        </label>
      )}
      <div className="dash-select-wrap">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`dash-select ${className}`}
          {...rest}
        >
          {children ||
            options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
        </select>
        <ChevronDown size={16} className="dash-select__chevron" aria-hidden />
      </div>
      {hint && <p className="dash-field__hint">{hint}</p>}
    </div>
  );
};

export default DashSelect;

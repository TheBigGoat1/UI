import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const VARIANT_CLASS = {
  'fade-up': 'scroll-reveal--fade-up',
  bounce: 'scroll-reveal--bounce',
  scale: 'scroll-reveal--scale',
};

/**
 * Wraps content for viewport-triggered entrance animations.
 */
const ScrollReveal = ({
  as: Tag = 'div',
  variant = 'fade-up',
  delay = 0,
  className = '',
  children,
  ...rest
}) => {
  const { ref, visible } = useScrollReveal();

  return (
    <Tag
      ref={ref}
      className={`scroll-reveal ${VARIANT_CLASS[variant] || VARIANT_CLASS['fade-up']} ${
        visible ? 'scroll-reveal--visible' : ''
      } ${className}`}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default ScrollReveal;

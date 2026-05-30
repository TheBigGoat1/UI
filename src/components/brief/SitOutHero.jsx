import React from 'react';
import { Coffee } from 'lucide-react';

const SitOutHero = ({ message }) => (
  <div className="sit-out-hero">
    <Coffee size={28} className="sit-out-hero__icon" />
    <h3 className="sit-out-hero__title">Stand aside — no A+ setup</h3>
    <p className="sit-out-hero__text">
      {message ||
        'Capital preserved is a win. The desk would rather you skip than force three correlated trades.'}
    </p>
  </div>
);

export default SitOutHero;

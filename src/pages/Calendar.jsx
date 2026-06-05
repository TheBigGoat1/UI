import React from 'react';
import { useNavigate } from 'react-router-dom';
import EconomicCalendar from '../components/calendar/EconomicCalendar.jsx';
import { useTerminalRealtime } from '../hooks/useTerminalRealtime.js';

/** Full-page economic calendar — MRKT pro table + Claude brain drawer */
const Calendar = () => {
  const navigate = useNavigate();
  const { prices } = useTerminalRealtime('XAUUSD');

  return (
    <div className="dash-page flex flex-col h-full min-h-0 pb-4">
      <EconomicCalendar
        proLayout
        defaultSymbol="XAUUSD"
        prices={prices}
        onSelectAsset={(sym) => navigate(`/dashboard?symbol=${encodeURIComponent(sym)}`)}
      />
    </div>
  );
};

export default Calendar;

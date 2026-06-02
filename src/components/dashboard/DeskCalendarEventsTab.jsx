import React from 'react';
import DeskHomeCalendar from './DeskHomeCalendar.jsx';

/**
 * Home desk Calendar Events tab — release table only (MRKT reference).
 */
const DeskCalendarEventsTab = ({ symbol, prices, onSelectAsset, onEventInsight }) => (
  <DeskHomeCalendar
    symbol={symbol}
    prices={prices}
    onSelectAsset={onSelectAsset}
    onEventInsight={onEventInsight}
  />
);

export default DeskCalendarEventsTab;

import React from 'react';
import { CalendarDays } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import EventGateBanner from '../components/trading/EventGateBanner';
import EconomicCalendar from '../components/calendar/EconomicCalendar.jsx';

const Calendar = () => (
    <div className="dash-page flex flex-col gap-6 h-full min-h-0 pb-8">
      <PageHeader
        icon={CalendarDays}
        title="Economic Calendar"
        description="Macro releases for US, EU, UK, JP, AU, CA, CH, NZ, CN — filter by impact, country, and date."
      />
      <EventGateBanner />
    <EconomicCalendar />
    </div>
  );

export default Calendar;

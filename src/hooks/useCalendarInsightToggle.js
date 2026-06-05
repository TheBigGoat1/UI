import { useCallback, useState } from 'react';

/** Row id for a calendar event in brain lists */
export function calendarEventRowId(event) {
  if (!event) return null;
  return event.id || `${event.event_name || event.event}-${event.event_time}`;
}

/** Toggle which calendar event shows inline Claude analysis */
export function useCalendarInsightToggle() {
  const [activeId, setActiveId] = useState(null);

  const toggle = useCallback((event) => {
    const id = calendarEventRowId(event);
    if (!id) return;
    setActiveId((cur) => (cur === id ? null : id));
  }, []);

  const close = useCallback(() => setActiveId(null), []);

  const isActive = useCallback((event) => activeId === calendarEventRowId(event), [activeId]);

  return { activeId, toggle, close, isActive };
}

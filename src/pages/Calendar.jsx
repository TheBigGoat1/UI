import React, { useEffect, useState } from "react";
import { api } from "../services/api/api.js";
import {
  CalendarDays,
  Filter,
  Globe,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";

const Calendar = () => {
  const [events, setEvents] = useState([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Accordion State
  const [expandedId, setExpandedId] = useState(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [filters, setFilters] = useState({
    country: "ALL",
    importance: "ALL",
    from: "",
    to: "",
  });

  const fetchEvents = async () => {
    if (page === 1) {
      setLoading(true);
      setEvents([]);
    } else {
      setIsFetchingMore(true);
    }

    try {
      const params = {
        page,
        limit,
        ...(filters.country !== "ALL" && { country: filters.country }),
        ...(filters.importance !== "ALL" && { importance: filters.importance }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      };

      const response = await api.calendar.getEvents(params);

      if (response.success) {
        const newData = response.data || [];

        if (page === 1) {
          setEvents(newData);
        } else {
          setEvents((prev) => [...prev, ...newData]);
        }

        setHasMore(newData.length === limit);
      } else {
        if (page === 1) setEvents([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load calendar", error);
      if (page === 1) setEvents([]);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // --- INFINITE SCROLL LISTENER ---
  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (!loading && !isFetchingMore && hasMore) {
        setPage((prev) => prev + 1);
      }
    }
  };

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getImpactColor = (imp) => {
    switch (imp?.toUpperCase()) {
      case "HIGH":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "MEDIUM":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="dash-page space-y-8 h-full flex flex-col">
      <PageHeader
        icon={CalendarDays}
        title="Economic Calendar"
        description="Real-time macro events and impact analysis."
      />

      <div className="rounded-xl border border-border/60 bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface border border-border rounded-md px-3 py-2">
            <span className="text-xs text-text-muted uppercase">From</span>
            <input
              type="date"
              className="bg-transparent text-sm text-text-main focus:outline-none w-28"
              onChange={(e) => handleFilterChange("from", e.target.value)}
            />
            <span className="text-border">|</span>
            <span className="text-xs text-text-muted uppercase">To</span>
            <input
              type="date"
              className="bg-transparent text-sm text-text-main focus:outline-none w-28"
              onChange={(e) => handleFilterChange("to", e.target.value)}
            />
          </div>

          <div className="flex items-center bg-surface border border-border rounded-md px-3 py-2">
            <Globe size={16} className="text-text-muted mr-2" />
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange("country", e.target.value)}
              className="bg-transparent border-none text-sm text-text-main focus:ring-0 outline-none cursor-pointer"
            >
              <option value="ALL">All Countries</option>
              <option value="US">United States</option>
              <option value="EU">Eurozone</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
            </select>
          </div>

          <div className="flex items-center bg-surface border border-border rounded-md px-3 py-2">
            <AlertCircle size={16} className="text-text-muted mr-2" />
            <select
              value={filters.importance}
              onChange={(e) => handleFilterChange("importance", e.target.value)}
              className="bg-transparent border-none text-sm text-text-main focus:ring-0 outline-none cursor-pointer"
            >
              <option value="ALL">All Impact</option>
              <option value="HIGH">High Impact</option>
              <option value="MEDIUM">Medium Impact</option>
              <option value="LOW">Low Impact</option>
            </select>
          </div>

          <button
            onClick={() => {
              setPage(1);
              fetchEvents();
            }}
            className="p-2 bg-surface border border-border rounded-md hover:bg-surface/80 transition-colors text-text-muted"
            title="Refresh"
          >
            <RefreshCw
              size={18}
              className={loading && page === 1 ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* Events Table Container */}
      <div className="bg-surface border border-border rounded-lg flex flex-col overflow-hidden flex-1 min-h-0">
        <div
          className="overflow-y-auto overflow-x-auto flex-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          onScroll={handleScroll}
        >
          <table className="w-full text-sm text-left relative">
            {/* STICKY HEADER */}
            <thead className="text-xs text-text-muted uppercase bg-background border-b border-border sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Country</th>
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4">Impact</th>
                <th className="px-6 py-4 text-right">Actual</th>
                <th className="px-6 py-4 text-right">Forecast</th>
                <th className="px-6 py-4 text-right">Previous</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading && page === 1 ? (
                Array(10)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 bg-background rounded w-8"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-background rounded w-48"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-background rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-background rounded w-12 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-background rounded w-12 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-background rounded w-12 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-background rounded w-6 ml-auto"></div>
                      </td>
                    </tr>
                  ))
              ) : events.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-text-muted"
                  >
                    No scheduled events found for these filters.
                  </td>
                </tr>
              ) : (
                events.map((event, idx) => {
                  const isSurprise =
                    event.actual !== null &&
                    event.forecast !== null &&
                    parseFloat(event.actual) > parseFloat(event.forecast);

                  const rowKey = event.id
                    ? `${event.id}-${idx}`
                    : `event-${idx}`;

                  return (
                    <React.Fragment key={rowKey}>
                      {/* MAIN ROW */}
                      <tr
                        onClick={() => toggleRow(rowKey)}
                        className={`cursor-pointer transition-colors hover:bg-background/50 ${expandedId === rowKey ? 'bg-background/50' : ''}`}
                      >
                        <td className="px-6 py-4 font-bold text-text-main flex items-center gap-3">
                          {/* Dynamically load the country flag using FlagCDN */}
                          {event.country && (
                            <img 
                              src={`https://flagcdn.com/w40/${event.country.toLowerCase()}.png`} 
                              alt={event.country} 
                              className="w-5 h-3.5 rounded-sm object-cover border border-border/50"
                            />
                          )}
                          <span className="uppercase">{event.country}</span>
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {event.event_name}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getImpactColor(event.importance)}`}
                          >
                            {event.importance}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-mono ${isSurprise ? "text-emerald-500" : "text-text-main"}`}
                        >
                          {event.actual ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-text-muted">
                          {event.forecast ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-text-muted">
                          {event.previous ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-right text-text-muted">
                          <div className="flex justify-end">
                            {expandedId === rowKey ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </td>
                      </tr>

                      {/* ACCORDION ROW */}
                      {expandedId === rowKey && (
                        <tr className="bg-background/30 border-b border-border">
                          <td colSpan="7" className="px-6 py-6">
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="bg-surface border border-border p-4 rounded-lg">
                                <div className="flex items-center gap-2 text-primary font-bold mb-2 text-sm">
                                  <Info size={16} /> Data Definition
                                </div>
                                <p className="text-sm text-text-muted leading-relaxed">
                                  {/* Fallback text if your API doesn't return a description yet */}
                                  {event.description || `The ${event.event_name} is a key macroeconomic indicator for the ${event.country} region. Higher than expected readings generally indicate bullish sentiment.`}
                                </p>
                              </div>

                              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                                <div className="flex items-center gap-2 text-primary font-bold mb-2 text-sm">
                                  <TrendingUp size={16} /> Institutional Context
                                </div>
                                <p className="text-sm text-text-main leading-relaxed">
                                  {/* Fallback text if your API doesn't return analyst notes yet */}
                                  {event.analyst_note || `Consensus forecast currently sits at ${event.forecast || 'N/A'}. Deviations from this baseline will likely trigger immediate volatility in related currency pairs.`}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {/* INFINITE SCROLL LOADERS */}
              {isFetchingMore && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-text-muted"
                  >
                    <RefreshCw
                      size={20}
                      className="animate-spin mx-auto mb-2 opacity-50"
                    />
                    <span className="text-xs">Loading more events...</span>
                  </td>
                </tr>
              )}

              {!hasMore && events.length > 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-6 text-center text-[10px] text-text-muted uppercase tracking-widest font-bold opacity-50"
                  >
                    End of Calendar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Calendar;

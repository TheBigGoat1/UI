import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { api } from "../../services/api/api.js";
import PageHeader from "../layout/PageHeader";
import EventGateBanner from "../trading/EventGateBanner";
import DashSelect from "../ui/DashSelect.jsx";
import EconomicCalendarProTable from "./EconomicCalendarProTable.jsx";
import EconomicCalendarBrainDrawer from "./EconomicCalendarBrainDrawer.jsx";
import {
  CalendarDays,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  Calendar as CalIcon,
  LayoutGrid,
  List,
  Search,
  Brain,
} from "lucide-react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CATEGORY_FILTERS = [
  { id: "ALL", label: "Categories" },
  { id: "EMPLOYMENT", label: "Employment", re: /employ|nfp|payroll|jobless|unemployment|claims/i },
  { id: "INFLATION", label: "Inflation", re: /cpi|ppi|pce|inflation|price index/i },
  { id: "RATES", label: "Rates", re: /rate|fomc|fed|ecb|boe|boj|policy|decision/i },
  { id: "PMI", label: "PMI", re: /pmi|ism|manufacturing|services/i },
  { id: "GDP", label: "GDP", re: /gdp|growth|output/i },
];

const DEFAULT_COUNTRIES = ["US", "EU", "GB", "JP", "AU", "CA", "CH"];

const flagCode = (country) => {
  const c = String(country || "").toLowerCase();
  if (c === "eu") return "eu";
  return c.slice(0, 2);
};

const formatTimeUtc = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
};

const formatDateLong = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

const toDayKey = (iso) => String(iso).slice(0, 10);

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

function countryHintForSymbol(symbol) {
  const s = String(symbol || "").toUpperCase();
  if (/EUR|EURO|DE30|GER/.test(s)) return "EU";
  if (/GBP|UK100|FTSE/.test(s)) return "GB";
  if (/JPY|JP225|NI225/.test(s)) return "JP";
  if (/AUD|ASX/.test(s)) return "AU";
  if (/CAD/.test(s)) return "CA";
  if (/CHF|SWI/.test(s)) return "CH";
  if (/NZD/.test(s)) return "NZ";
  if (/CNY|CN50/.test(s)) return "CN";
  return "US";
}

const EconomicCalendar = ({
  embedded = false,
  proLayout = false,
  defaultSymbol = null,
  onEventInsight = null,
  prices = {},
  onSelectAsset = null,
}) => {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [viewMode, setViewMode] = useState(proLayout ? "list" : "month");
  const [years, setYears] = useState([]);
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [clock, setClock] = useState(() => new Date());
  const [category, setCategory] = useState("ALL");
  const [insightEvents, setInsightEvents] = useState([]);
  const [insightIds, setInsightIds] = useState(() => new Set());

  const [filters, setFilters] = useState({
    country: embedded && defaultSymbol ? countryHintForSymbol(defaultSymbol) : "ALL",
    importance: embedded ? "HIGH" : "ALL",
    q: "",
  });

  const loadYears = useCallback(async () => {
    try {
      const res = await api.calendar.getYears();
      if (res?.success && res.data?.years?.length) {
        setYears(res.data.years);
      } else {
        const y = now.getUTCFullYear();
        setYears([y - 1, y, y + 1]);
      }
    } catch {
      const y = now.getUTCFullYear();
      setYears([y - 1, y, y + 1]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = {
        limit: 500,
        ...(filters.q && { q: filters.q }),
      };

      if (proLayout) {
        const from = new Date();
        from.setUTCHours(0, 0, 0, 0);
        from.setUTCDate(from.getUTCDate() - 1);
        const to = new Date(from.getTime() + 21 * 24 * 60 * 60 * 1000);
        params.from = from.toISOString().slice(0, 10);
        params.to = to.toISOString().slice(0, 10);
        if (filters.country !== "ALL") params.country = filters.country;
        if (filters.importance !== "ALL") params.importance = filters.importance;
      } else {
        params.year = year;
        if (filters.country !== "ALL") params.country = filters.country;
        if (filters.importance !== "ALL") params.importance = filters.importance;
        if (viewMode === "year" || viewMode === "list") {
          delete params.month;
        } else {
          params.month = month + 1;
        }
      }

      const [eventsRes, summaryRes] = await Promise.all([
        api.calendar.getEvents(params),
        proLayout ? Promise.resolve(null) : api.calendar.getSummary(year),
      ]);

      if (eventsRes?.success) {
        setEvents(eventsRes.data || []);
        setMeta(eventsRes.meta || null);
      } else {
        setEvents([]);
        setLoadError(eventsRes?.error || "Could not load calendar events.");
      }

      if (summaryRes?.success) {
        setSummary(summaryRes.data);
      }
    } catch (e) {
      console.error("Calendar load failed", e);
      setEvents([]);
      setLoadError(e.error || e.message || "API offline — run npm run dev:all");
    } finally {
      setLoading(false);
    }
  }, [year, month, viewMode, filters, proLayout]);

  useEffect(() => {
    if (!proLayout) return undefined;
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, [proLayout]);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    setLoadError("");
    try {
      const res = await api.calendar.sync();
      if (!res?.success) {
        setLoadError(res?.error || "Calendar sync failed.");
        return;
      }
      await loadYears();
      await loadData();
    } catch (e) {
      setLoadError(e.error || "Calendar sync failed — start the API with npm run dev:all");
    } finally {
      setSyncing(false);
    }
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getUTCFullYear());
    setMonth(t.getUTCMonth());
    setSelectedDay(null);
    setViewMode(proLayout ? "list" : "month");
  };

  const resetFilters = () => {
    setFilters({ country: "ALL", importance: "ALL", q: "" });
    setCategory("ALL");
    setSelectedDay(null);
  };

  const toggleBrainInsight = (event, rowKey) => {
    const key = rowKey || event.id || `${event.event_name}-${event.event_time}`;
    setInsightIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setInsightEvents((prev) => {
      const exists = prev.some(
        (e) => (e.id || `${e.event_name}-${e.event_time}`) === key,
      );
      if (exists) return prev.filter((e) => (e.id || `${e.event_name}-${e.event_time}`) !== key);
      return [...prev, { ...event, _rowKey: key }];
    });
  };

  const clearInsight = (event) => {
    const key = event._rowKey || event.id || `${event.event_name}-${event.event_time}`;
    setInsightEvents((prev) =>
      prev.filter((e) => (e._rowKey || e.id || `${e.event_name}-${e.event_time}`) !== key),
    );
    setInsightIds((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const clearAllInsights = () => {
    setInsightEvents([]);
    setInsightIds(new Set());
  };

  const scrollUpNext = () => {
    const nowMs = Date.now();
    const source = proLayout ? proFilteredEvents : events;
    const upcoming = source
      .filter((e) => new Date(e.event_time).getTime() >= nowMs)
      .sort((a, b) => new Date(a.event_time) - new Date(b.event_time))[0];
    if (!upcoming) return;
    const dayKey = toDayKey(upcoming.event_time);
    setSelectedDay(dayKey);
    requestAnimationFrame(() => {
      const el = eventsScrollRef.current?.querySelector(
        proLayout ? `[data-day="${dayKey}"]` : `[data-day="${dayKey}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const shiftMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    setSelectedDay(null);
  };

  const shiftYear = (delta) => {
    setYear((y) => y + delta);
    setSelectedDay(null);
  };

  const dayCountMap = useMemo(() => {
    const map = {};
    (summary?.days || []).forEach((d) => {
      const key = String(d.day).slice(0, 10);
      map[key] = d;
    });
    return map;
  }, [summary]);

  const groupedEvents = useMemo(() => {
    let list = events;
    if (selectedDay) {
      list = list.filter((e) => toDayKey(e.event_time) === selectedDay);
    }
    const groups = {};
    for (const ev of list) {
      const key = toDayKey(ev.event_time);
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [events, selectedDay]);

  const proFilteredEvents = useMemo(() => {
    if (!proLayout) return [];
    let list = [...events];
    if (filters.country === "ALL") {
      list = list.filter((e) => DEFAULT_COUNTRIES.includes(String(e.country || "").toUpperCase()));
    }
    if (category !== "ALL") {
      const cat = CATEGORY_FILTERS.find((c) => c.id === category);
      if (cat?.re) list = list.filter((e) => cat.re.test(e.event_name || e.event || ""));
    }
    list.sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
    return list;
  }, [events, proLayout, filters.country, category]);

  const proGroupedDays = useMemo(() => {
    const groups = {};
    for (const ev of proFilteredEvents) {
      const key = toDayKey(ev.event_time);
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [proFilteredEvents]);

  const monthGrid = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1));
    const dim = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const startPad = first.getUTCDay();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, key, stats: dayCountMap[key] });
    }
    return cells;
  }, [year, month, dayCountMap]);

  const todayKey = toDayKey(new Date().toISOString());
  const bootSynced = useRef(false);
  const eventsScrollRef = useRef(null);

  const periodStats = useMemo(() => {
    const high = events.filter((e) => String(e.importance).toUpperCase() === "HIGH").length;
    const medium = events.filter((e) => String(e.importance).toUpperCase() === "MEDIUM").length;
    return { total: events.length, high, medium };
  }, [events]);

  useEffect(() => {
    if (loading || loadError || bootSynced.current || events.length > 0) return;
    bootSynced.current = true;
    (async () => {
      try {
        const health = await api.system.getHealth();
        if (health?.success) handleSync();
      } catch {
        /* ApiStatusBar handles offline state */
      }
    })();
  }, [loading, events.length, loadError]);

  return (
    <div
      className={
        embedded
          ? "economic-cal economic-cal--embedded"
          : proLayout
            ? `economic-cal economic-cal--pro flex flex-col gap-4 h-full min-h-0 flex-1${insightEvents.length ? " economic-cal--pro-drawer-open" : ""}`
            : "flex flex-col gap-6 h-full min-h-0 flex-1"
      }
    >
      {!embedded && !proLayout && (
        <>
          <PageHeader
            icon={CalendarDays}
            title="Economic Calendar"
            description="Macro releases for US, EU, UK, JP, AU, CA, CH, NZ, CN — filter by impact, country, and date."
          />
          <EventGateBanner />
        </>
      )}

      {embedded && defaultSymbol && (
        <div className="economic-cal__desk-head">
          <h3 className="economic-cal__desk-title">
            Economic calendar · <strong>{defaultSymbol}</strong>
          </h3>
          <p className="economic-cal__desk-sub">
            Same view as Calendar — month grid, filters, and live macro releases (UTC).
          </p>
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex flex-wrap items-center justify-between gap-3">
          <span>{loadError}</span>
          <button type="button" onClick={loadData} className="btn-ghost text-xs px-3 py-1.5 border border-red-500/30">
            Retry
          </button>
        </div>
      )}

      {proLayout && (
        <div className="economic-cal__pro-toolbar">
          <button type="button" onClick={goToday} className="economic-cal__pro-btn">
            <CalIcon size={14} /> Today
          </button>
          <span className="economic-cal__pro-clock" aria-live="off">
            {clock.toLocaleTimeString("en-GB", { hour12: false })}
          </span>
          <DashSelect
            label="Countries"
            value={filters.country}
            onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
            wrapperClassName="economic-cal__pro-select"
            options={[
              { value: "ALL", label: `Countries (${DEFAULT_COUNTRIES.length})` },
              { value: "US", label: "United States" },
              { value: "EU", label: "Eurozone" },
              { value: "GB", label: "United Kingdom" },
              { value: "JP", label: "Japan" },
              { value: "AU", label: "Australia" },
              { value: "CA", label: "Canada" },
              { value: "CH", label: "Switzerland" },
              { value: "NZ", label: "New Zealand" },
              { value: "CN", label: "China" },
            ]}
          />
          <DashSelect
            label="Categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            wrapperClassName="economic-cal__pro-select"
            options={CATEGORY_FILTERS.map((c) => ({ value: c.id, label: c.label }))}
          />
          <div className="economic-cal__impact-pills">
            {[
              { id: "HIGH", label: "High", cls: "high" },
              { id: "MEDIUM", label: "Med", cls: "med" },
              { id: "LOW", label: "Low", cls: "low" },
              { id: "NONE", label: "None", cls: "none" },
            ].map(({ id, label, cls }) => (
              <button
                key={id}
                type="button"
                className={`economic-cal__impact-pill economic-cal__impact-pill--${cls} ${
                  filters.importance === id ? "is-active" : ""
                }`}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    importance: f.importance === id ? "ALL" : id,
                  }))
                }
              >
                <span className={`economic-cal__impact-pill-dot economic-cal__impact-pill-dot--${cls}`} />
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={resetFilters} className="economic-cal__pro-btn economic-cal__pro-btn--ghost">
            Reset
          </button>
          <button type="button" onClick={scrollUpNext} className="economic-cal__pro-btn economic-cal__pro-btn--accent">
            Up next
          </button>
          <div className="economic-cal__pro-search">
            <Search size={14} />
            <input
              type="search"
              placeholder="Search events…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
          <button
            type="button"
            onClick={loadData}
            className="economic-cal__pro-btn economic-cal__pro-btn--icon"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      )}

      {!proLayout && (
      <div
        className={
          embedded
            ? "economic-cal__stats"
            : "grid grid-cols-2 md:grid-cols-4 gap-3"
        }
      >
        <div className={embedded ? "economic-cal__stat" : "dash-stat p-4"}>
          <div className="dash-stat__label">This period</div>
          <div className="dash-stat__value text-xl">{periodStats.total}</div>
        </div>
        <div className={embedded ? "economic-cal__stat" : "dash-stat p-4"}>
          <div className="dash-stat__label">High impact</div>
          <div className="dash-stat__value text-xl text-red-400">{periodStats.high}</div>
        </div>
        <div className={embedded ? "economic-cal__stat" : "dash-stat p-4"}>
          <div className="dash-stat__label">Medium impact</div>
          <div className="dash-stat__value text-xl text-yellow-400">{periodStats.medium}</div>
        </div>
        <div className={embedded ? "economic-cal__stat" : "dash-stat p-4"}>
          <div className="dash-stat__label">Year total</div>
          <div className="dash-stat__value text-xl">{summary?.total ?? "—"}</div>
        </div>
      </div>
      )}

      {!proLayout && (
      <div
        className={
          embedded
            ? "economic-cal__toolbar"
            : "rounded-xl border border-border/60 bg-surface p-4 space-y-4"
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-border bg-background/50 overflow-hidden">
            <button
              type="button"
              onClick={() => (viewMode === "year" ? shiftYear(-1) : shiftMonth(-1))}
              className="p-2.5 hover:bg-surface-hover text-text-muted"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="px-4 py-2 min-w-[200px] text-center border-x border-border">
              {viewMode === "year" ? (
                <span className="font-bold text-text-main text-lg">{year}</span>
              ) : (
                <span className="font-bold text-text-main">
                  {MONTH_NAMES[month]} {year}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => (viewMode === "year" ? shiftYear(1) : shiftMonth(1))}
              className="p-2.5 hover:bg-surface-hover text-text-muted"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <DashSelect
            label="Year"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setSelectedDay(null);
            }}
            wrapperClassName="w-[120px]"
            options={(years.length ? years : [year - 1, year, year + 1]).map((y) => ({
              value: y,
              label: String(y),
            }))}
          />

          {viewMode === "month" && (
            <DashSelect
              label="Month"
              value={String(month)}
              onChange={(e) => {
                setMonth(Number(e.target.value));
                setSelectedDay(null);
              }}
              wrapperClassName="w-[160px]"
              options={MONTH_NAMES.map((name, i) => ({
                value: String(i),
                label: name,
              }))}
            />
          )}

          <button type="button" onClick={goToday} className="btn-ghost text-sm px-3 py-2">
            Today
          </button>

          <div className="flex rounded-lg border border-border overflow-hidden ml-auto">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 ${
                viewMode === "month" ? "bg-primary/15 text-primary" : "text-text-muted"
              }`}
            >
              <CalIcon size={16} /> Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("year")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 border-l border-border ${
                viewMode === "year" ? "bg-primary/15 text-primary" : "text-text-muted"
              }`}
            >
              <LayoutGrid size={16} /> Year
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 border-l border-border ${
                viewMode === "list" ? "bg-primary/15 text-primary" : "text-text-muted"
              }`}
            >
              <List size={16} /> List
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-background/50 border border-border rounded-lg px-3 py-2 flex-1 min-w-[180px] max-w-xs">
            <Search size={16} className="text-text-muted mr-2 shrink-0" />
            <input
              type="search"
              placeholder="Search events…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              className="bg-transparent text-sm w-full outline-none text-text-main"
            />
          </div>

          <DashSelect
            label="Country"
            value={filters.country}
            onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
            wrapperClassName="min-w-[180px]"
            options={[
              { value: "ALL", label: "All countries" },
              { value: "US", label: "United States" },
              { value: "EU", label: "Eurozone" },
              { value: "GB", label: "United Kingdom" },
              { value: "JP", label: "Japan" },
              { value: "AU", label: "Australia" },
              { value: "CA", label: "Canada" },
              { value: "CH", label: "Switzerland" },
              { value: "NZ", label: "New Zealand" },
              { value: "CN", label: "China" },
            ]}
          />

          <DashSelect
            label="Impact"
            value={filters.importance}
            onChange={(e) => setFilters((f) => ({ ...f, importance: e.target.value }))}
            wrapperClassName="min-w-[150px]"
            options={[
              { value: "ALL", label: "All impact" },
              { value: "HIGH", label: "High impact" },
              { value: "MEDIUM", label: "Medium impact" },
              { value: "LOW", label: "Low impact" },
            ]}
          />

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync years"}
          </button>

          <button
            type="button"
            onClick={loadData}
            className="p-2 border border-border rounded-lg text-text-muted hover:text-text-main"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {viewMode !== "year" && (
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {MONTH_NAMES.map((name, i) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setMonth(i);
                  setViewMode("month");
                  setSelectedDay(null);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  month === i && viewMode === "month"
                    ? "bg-primary text-bg-deep"
                    : "bg-background border border-border text-text-muted hover:text-text-main"
                }`}
              >
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
        )}

        {meta && (
          <p className="text-xs text-text-muted">
            Showing <strong className="text-text-main">{events.length}</strong> of{" "}
            <strong className="text-text-main">{meta.total}</strong> events
            {viewMode === "month" && ` in ${MONTH_NAMES[month]} ${year}`}
            {viewMode === "year" && ` in ${year}`}
            {selectedDay && ` · filtered to ${selectedDay}`}
            {summary?.total != null && ` · ${summary.total} events in ${year}`}
          </p>
        )}
      </div>
      )}

      <div
        className={
          embedded || proLayout
            ? "economic-cal__main-grid"
            : "grid lg:grid-cols-[minmax(280px,320px)_1fr] gap-6 flex-1 min-h-0"
        }
      >
        {/* Sidebar: year overview or month grid */}
        {!proLayout && (
        <div className="space-y-4 economic-cal__sidebar">
          {viewMode === "year" && summary?.months && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                {year} overview
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {summary.months.map((m) => (
                  <button
                    key={m.month}
                    type="button"
                    onClick={() => {
                      setMonth(m.month - 1);
                      setViewMode("month");
                      setSelectedDay(null);
                    }}
                    className="text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-sm font-bold text-text-main">{MONTH_NAMES[m.month - 1]}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {m.count} events · {m.high_count} high
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(viewMode === "month" || viewMode === "list") && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {MONTH_NAMES[month]} {year}
                </h3>
                {selectedDay && (
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="text-[10px] text-primary font-bold"
                  >
                    Clear day
                  </button>
                )}
              </div>
              <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-text-muted mb-1">
                {WEEKDAYS.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((cell, i) =>
                  cell ? (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() =>
                        setSelectedDay(selectedDay === cell.key ? null : cell.key)
                      }
                      className={`aspect-square rounded-md text-xs font-medium flex flex-col items-center justify-center gap-0.5 transition-colors ${
                        selectedDay === cell.key
                          ? "bg-primary text-bg-deep"
                          : cell.key === todayKey
                            ? "ring-1 ring-primary/50 bg-primary/10"
                            : cell.stats
                              ? "bg-surface-hover hover:bg-primary/10"
                              : "text-text-muted hover:bg-surface-hover"
                      }`}
                    >
                      {cell.day}
                      {cell.stats && (
                        <span
                          className={`w-1 h-1 rounded-full ${
                            cell.stats.high_count > 0 ? "bg-red-500" : "bg-primary"
                          }`}
                        />
                      )}
                    </button>
                  ) : (
                    <span key={`pad-${i}`} />
                  ),
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Event list */}
        <div
          className={
            embedded
              ? "economic-cal__events-panel"
              : proLayout
                ? "economic-cal__events-panel economic-cal__events-panel--pro"
                : "bg-surface border border-border rounded-xl flex flex-col min-h-[420px] overflow-hidden"
          }
        >
          {!proLayout && (
          <div className="px-4 py-3 border-b border-border bg-background/40 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-text-main">
              {viewMode === "list"
                ? `All events · ${year}`
                : viewMode === "year"
                  ? `Year ${year} schedule`
                  : `${MONTH_NAMES[month]} ${year} releases`}
            </h3>
            <span className="text-[10px] font-mono text-text-muted uppercase">
              Times in UTC · Actual / Forecast / Previous
            </span>
          </div>
          )}
          <div className="overflow-y-auto flex-1 custom-scrollbar" ref={eventsScrollRef}>
            {proLayout ? (
              <EconomicCalendarProTable
                groupedDays={proGroupedDays}
                loading={loading}
                loadError={loadError}
                onSync={handleSync}
                syncing={syncing}
                insightIds={insightIds}
                onBrainClick={toggleBrainInsight}
              />
            ) : loading ? (
              <div className="p-8 space-y-3">
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="h-14 bg-background/50 rounded-lg animate-pulse" />
                  ))}
              </div>
            ) : groupedEvents.length === 0 ? (
              <div className="p-12 text-center text-text-muted">
                <CalendarDays size={40} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium text-text-main mb-1">No events for this period</p>
                <p className="text-xs mb-4">
                  {loadError ? "Fix the API connection above, then sync." : "Sync loads multi-year macro data."}
                </p>
                <button type="button" onClick={handleSync} disabled={syncing} className="btn-primary text-sm px-4 py-2">
                  {syncing ? "Syncing…" : "Sync full calendar"}
                </button>
              </div>
            ) : (
              groupedEvents.map(([dayKey, dayEvents]) => (
                <section key={dayKey} className="border-b border-border/60 last:border-0" data-day={dayKey}>
                  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 py-2.5 border-b border-border/50">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">
                      {formatDateLong(dayKey)}
                    </p>
                    <p className="text-[10px] text-text-muted">{dayEvents.length} releases</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase tracking-wider text-text-muted border-b border-border/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold w-20">Time</th>
                        <th className="px-2 py-2 text-left font-bold w-16">Impact</th>
                        <th className="px-2 py-2 text-left font-bold w-14">Ccy</th>
                        <th className="px-2 py-2 text-left font-bold">Event</th>
                        {proLayout && <th className="px-2 py-2 w-10" />}
                        <th className="px-3 py-2 text-right font-bold">Actual</th>
                        <th className="px-3 py-2 text-right font-bold">Forecast</th>
                        <th className="px-3 py-2 text-right font-bold">Previous</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {dayEvents.map((event, idx) => {
                        const rowKey = event.id || `${dayKey}-${idx}`;
                        const isSurprise =
                          event.actual != null &&
                          event.forecast != null &&
                          parseFloat(event.actual) > parseFloat(event.forecast);

                        return (
                          <React.Fragment key={rowKey}>
                            <tr
                              onClick={() =>
                                setExpandedId(expandedId === rowKey ? null : rowKey)
                              }
                              className="cursor-pointer hover:bg-background/40 border-b border-border/30"
                            >
                              <td className="px-4 py-3 w-20 font-mono text-xs text-text-muted whitespace-nowrap">
                                {formatTimeUtc(event.event_time)} UTC
                              </td>
                              <td className="px-2 py-3 w-16">
                                <span
                                  className={`economic-cal__impact--${String(event.importance || 'low').toLowerCase()}`}
                                >
                                  {event.importance === 'HIGH' ? 'High' : event.importance === 'MEDIUM' ? 'Med' : 'Low'}
                                </span>
                              </td>
                              <td className="px-2 py-3 w-14">
                                <span className="economic-cal__ccy">
                                  <img
                                    src={`https://flagcdn.com/w40/${flagCode(event.country)}.png`}
                                    alt=""
                                    className="w-5 h-3.5 rounded object-cover border border-border/50"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                  {event.country}
                                </span>
                              </td>
                              <td className="px-2 py-3 font-medium text-text-main min-w-[140px]">
                                {event.event_name}
                              </td>
                              {proLayout && (
                                <td className="px-2 py-3 w-10">
                                  <button
                                    type="button"
                                    className="economic-cal__brain"
                                    title="Insidr desk read"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEventInsight?.(event);
                                    }}
                                  >
                                    <Brain size={14} />
                                  </button>
                                </td>
                              )}
                              <td
                                className={`px-3 py-3 text-right font-mono text-xs ${isSurprise ? "text-emerald-500" : ""}`}
                              >
                                {event.actual ?? "—"}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-xs text-text-muted">
                                {event.forecast ?? "—"}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-xs text-text-muted">
                                {event.previous ?? "—"}
                              </td>
                              <td className="px-3 py-3 text-text-muted">
                                {expandedId === rowKey ? (
                                  <ChevronUp size={16} />
                                ) : (
                                  <ChevronDown size={16} />
                                )}
                              </td>
                            </tr>
                            {expandedId === rowKey && (
                              <tr className="bg-background/30">
                                <td colSpan={proLayout ? 9 : 8} className="px-4 py-4">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="border border-border rounded-lg p-3">
                                      <p className="text-xs font-bold text-primary flex items-center gap-1 mb-2">
                                        <Info size={14} /> Definition
                                      </p>
                                      <p className="text-sm text-text-muted leading-relaxed">
                                        {event.description || `${event.event_name} — macro release tracked on the Insidr economic calendar.`}
                                      </p>
                                    </div>
                                    <div className="border border-primary/20 bg-primary/5 rounded-lg p-3">
                                      <p className="text-xs font-bold text-primary flex items-center gap-1 mb-2">
                                        <TrendingUp size={14} /> Context
                                      </p>
                                      <p className="text-sm text-text-main leading-relaxed">
                                        {event.analyst_note || `Watch ${defaultSymbol || "desk"} around the print — surprise vs forecast drives the first move.`}
                                      </p>
                                    </div>
                                  </div>
                                  {onEventInsight && (
                                    <button
                                      type="button"
                                      className="economic-cal__insight-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEventInsight(event);
                                      }}
                                    >
                                      <Brain size={14} />
                                      Insidr desk read for {defaultSymbol || "chart"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              ))
            )}
          </div>
        </div>
      </div>

      {proLayout && (
        <EconomicCalendarBrainDrawer
          events={insightEvents}
          symbol={defaultSymbol || "XAUUSD"}
          prices={prices}
          onSelectAsset={onSelectAsset}
          onRemove={clearInsight}
          onClearAll={clearAllInsights}
          onClose={clearAllInsights}
        />
      )}
    </div>
  );
};

export default EconomicCalendar;

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Info,
  ChevronDown,
  RefreshCw,
  ArrowRight,
  Loader2,
  MapPin,
  Users,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api/api.js';
import DeskPanelSkeleton from './DeskPanelSkeleton.jsx';
import {
  buildCapitalFlowNarrative,
  getFlowsForMode,
  mergeGeneralMarketsDesk,
  truncateLabel,
  mapCalendarApiEvents,
  mapPastScheduleEvents,
  pastEventsHeaderDate,
} from '../../utils/deskGeneralMarkets.js';
import { flowSourceLabel, flowsAreFlat } from '../../utils/sectorFlowModel.js';
import { formatDeskLiveTime } from '../../utils/deskLiveCompute.js';

function SentimentGauge({ score, label, tone }) {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = -180 + (clamped / 100) * 180;
  const cx = 80;
  const cy = 78;
  const r = 58;
  const rad = (angle * Math.PI) / 180;
  const dotX = cx + r * Math.cos(rad);
  const dotY = cy + r * Math.sin(rad);

  return (
    <div className="desk-gm-gauge" aria-label={`Sentiment score ${clamped}, ${label}`}>
      <svg viewBox="0 0 160 92" className="desk-gm-gauge__svg" aria-hidden>
        <defs>
          <linearGradient id="gmArcRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="gmArcYellow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <linearGradient id="gmArcGreen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path d="M 22 78 A 58 58 0 0 1 58 28" fill="none" stroke="url(#gmArcRed)" strokeWidth="12" strokeLinecap="round" />
        <path d="M 58 28 A 58 58 0 0 1 102 28" fill="none" stroke="url(#gmArcYellow)" strokeWidth="12" strokeLinecap="round" />
        <path d="M 102 28 A 58 58 0 0 1 138 78" fill="none" stroke="url(#gmArcGreen)" strokeWidth="12" strokeLinecap="round" />
        <circle cx={dotX} cy={dotY} r="5.5" fill="#fff" stroke="#000" strokeWidth="1.5" />
      </svg>
      <div className="desk-gm-gauge__center">
        <span className="desk-gm-gauge__score">{clamped}</span>
        <span className={`desk-gm-gauge__label desk-gm-gauge__label--${tone}`}>{label}</span>
      </div>
    </div>
  );
}

function FactorRow({ factor }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="desk-gm__factor">
      <button
        type="button"
        className="desk-gm__factor-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="desk-gm__factor-label">{truncateLabel(factor.label)}</span>
        <span className="desk-gm__factor-pct">{factor.weight}%</span>
        <ChevronDown size={12} className={open ? 'desk-gm__factor-chev--open' : ''} aria-hidden />
      </button>
      <div className="desk-gm__factor-bar">
        <span style={{ width: `${factor.weight}%` }} />
      </div>
      {open && factor.note && <p className="desk-gm__factor-note">{factor.note}</p>}
    </li>
  );
}

function PastEventRow({ ev }) {
  return (
    <li className="desk-gm__past-event">
      <div className="desk-gm__past-event-top">
        <span className={`desk-gm__past-dot desk-gm__past-dot--${ev.categoryDot}`} aria-hidden />
        <span className="desk-gm__past-cat">{ev.category}</span>
        <span className="desk-gm__past-time">{ev.time}</span>
      </div>
      <p className="desk-gm__past-title">{ev.title}</p>
      {(ev.venue || ev.press) && (
        <div className="desk-gm__past-meta">
          {ev.venue && (
            <span>
              <MapPin size={11} aria-hidden /> {ev.venue}
            </span>
          )}
          {ev.press && (
            <span>
              <Users size={11} aria-hidden /> {ev.press}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

function DivergingFlowRow({ row, maxAbs, rank }) {
  const pos = row.pct > 0.005;
  const neg = row.pct < -0.005;
  const neutral = !pos && !neg;
  const abs = Math.abs(row.pct);
  const scale = Math.max(maxAbs, 0.08);
  const w = neutral ? 0 : Math.min(50, Math.max(8, (abs / scale) * 46));

  return (
    <li
      className={`desk-gm__flow-row desk-gm__flow-row--div ${pos ? 'up' : neg ? 'down' : 'flat'} ${rank === 'leader' ? 'desk-gm__flow-row--leader' : ''} ${rank === 'laggard' ? 'desk-gm__flow-row--laggard' : ''}`}
    >
      <span className="desk-gm__flow-ticker">{row.ticker}</span>
      <span className="desk-gm__flow-name">{row.name}</span>
      <div className="desk-gm__flow-diverge">
        <div className="desk-gm__flow-diverge-track">
          {neutral ? (
            <span className="desk-gm__flow-diverge-neutral" aria-hidden />
          ) : pos ? (
            <div className="desk-gm__flow-diverge-bar up" style={{ width: `${w}%`, marginLeft: '50%' }} />
          ) : (
            <div
              className="desk-gm__flow-diverge-bar down"
              style={{ width: `${w}%`, marginLeft: `${50 - w}%` }}
            />
          )}
        </div>
      </div>
      <span className={`desk-gm__flow-pct ${pos ? 'up' : neg ? 'down' : 'flat'}`}>
        {pos ? '+' : ''}
        {row.pct.toFixed(2)}%
      </span>
    </li>
  );
}

const DeskGeneralMarketsTab = ({ deskData, loading, onRefresh, prices = {}, brief = null, onSelectAsset }) => {
  const [flowMode, setFlowMode] = useState('liquidity');
  const [pastDateOpen, setPastDateOpen] = useState(true);
  const [liveEvents, setLiveEvents] = useState([]);
  const [calendarRaw, setCalendarRaw] = useState([]);
  const [pastCalendarRaw, setPastCalendarRaw] = useState([]);
  const [aiNarrative, setAiNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [etfFlows, setEtfFlows] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [syncingCal, setSyncingCal] = useState(false);
  const [syncError, setSyncError] = useState('');
  const autoSynced = useRef(false);

  const loadUpcomingEvents = useCallback(async () => {
    setEventsLoading(true);
    setSyncError('');
    try {
      const from = new Date();
      const to = new Date(from.getTime() + 21 * 24 * 60 * 60 * 1000);
      const pastFrom = new Date(from.getTime() - 3 * 24 * 60 * 60 * 1000);
      const [upcomingRes, pastRes] = await Promise.all([
        api.calendar.getEvents({
          from: from.toISOString(),
          to: to.toISOString(),
          country: 'US',
          importance: 'ALL',
          limit: 40,
        }),
        api.calendar.getEvents({
          from: pastFrom.toISOString(),
          to: from.toISOString(),
          country: 'US',
          importance: 'ALL',
          limit: 80,
        }),
      ]);
      if (pastRes?.success && Array.isArray(pastRes.data)) {
        setPastCalendarRaw(pastRes.data);
      }
      const res = upcomingRes;
      if (res?.success && Array.isArray(res.data)) {
        setCalendarRaw(res.data);
        setLiveEvents(mapCalendarApiEvents(res.data, 8));
        return res.data.length;
      }
      setCalendarRaw([]);
      setLiveEvents([]);
      return 0;
    } catch (e) {
      setSyncError(e.error || 'Could not load calendar events.');
      return 0;
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const handleSyncCalendar = useCallback(async () => {
    setSyncingCal(true);
    setSyncError('');
    try {
      const syncRes = await api.calendar.sync({});
      if (!syncRes?.success) {
        setSyncError(syncRes?.error || 'Calendar sync failed.');
      }
      await loadUpcomingEvents();
      onRefresh?.();
    } catch (e) {
      setSyncError(e.error || 'Calendar sync failed — run npm run dev:all');
    } finally {
      setSyncingCal(false);
    }
  }, [loadUpcomingEvents, onRefresh]);

  const loadEtfFlows = useCallback(async () => {
    try {
      const res = await api.desk.getCapitalFlows();
      if (res?.success && Array.isArray(res.data?.flows)) {
        setEtfFlows(res.data.flows);
      }
    } catch {
      /* keep last ETF snapshot */
    }
  }, []);

  useEffect(() => {
    loadEtfFlows();
    const id = setInterval(loadEtfFlows, 15000);
    return () => clearInterval(id);
  }, [loadEtfFlows]);

  useEffect(() => {
    let active = true;
    (async () => {
      const count = await loadUpcomingEvents();
      if (!active || count > 0 || autoSynced.current) return;
      autoSynced.current = true;
      setSyncingCal(true);
      try {
        await api.calendar.sync({});
        if (active) await loadUpcomingEvents();
        if (active) onRefresh?.();
      } catch (e) {
        if (active) setSyncError(e.error || 'Calendar sync failed.');
      } finally {
        if (active) setSyncingCal(false);
      }
    })();
    const refreshId = setInterval(loadUpcomingEvents, 60000);
    return () => {
      active = false;
      clearInterval(refreshId);
    };
  }, [loadUpcomingEvents, onRefresh]);

  const merged = useMemo(() => {
    const apiFlows = etfFlows.length
      ? etfFlows
      : deskData?.capitalFlows?.flows || [];
    const deskWithFlows = deskData
      ? {
          ...deskData,
          capitalFlows: {
            ...(deskData.capitalFlows || {}),
            flows: apiFlows,
            source: etfFlows.length ? 'yahoo' : deskData.capitalFlows?.source,
          },
        }
      : apiFlows.length
        ? { capitalFlows: { flows: apiFlows, source: 'yahoo' } }
        : null;
    return mergeGeneralMarketsDesk(deskWithFlows, prices, brief, calendarRaw);
  }, [deskData, prices, brief, calendarRaw, etfFlows]);

  const sentiment = merged.sentiment;
  const rawFlows = merged.capitalFlows?.flows || [];

  const flows = useMemo(() => getFlowsForMode(rawFlows, flowMode), [rawFlows, flowMode]);

  const pastEvents = useMemo(() => {
    const mapped = mapPastScheduleEvents(pastCalendarRaw, 8);
    if (mapped.length) return mapped;
    return mapPastScheduleEvents(
      (calendarRaw || []).filter((ev) => new Date(ev.event_time).getTime() <= Date.now()),
      6,
    );
  }, [pastCalendarRaw, calendarRaw]);
  const tone = sentiment?.score >= 58 ? 'bull' : sentiment?.score >= 45 ? 'neutral' : 'bear';
  const maxAbs = useMemo(
    () => Math.max(...flows.map((f) => Math.abs(f.pct)), 0.08),
    [flows],
  );
  const flowRanks = useMemo(() => {
    const sorted = [...flows].sort((a, b) => b.pct - a.pct);
    const leaders = new Set(sorted.filter((f) => f.pct > 0.02).slice(0, 2).map((f) => f.ticker));
    const laggards = new Set(sorted.filter((f) => f.pct < -0.02).slice(-2).map((f) => f.ticker));
    const map = new Map();
    for (const t of leaders) map.set(t, 'leader');
    for (const t of laggards) map.set(t, 'laggard');
    return map;
  }, [flows]);
  const flowSummary = useMemo(() => buildCapitalFlowNarrative(rawFlows, flowMode), [rawFlows, flowMode]);
  const displaySentimentSummary = aiNarrative?.sentimentSummary || sentiment?.summary;
  const displayFlowSummary = aiNarrative?.flowSummary || flowSummary;
  const claudeActive = aiNarrative?.provider === 'anthropic' || aiNarrative?.aiEnabled;

  useEffect(() => {
    if (!sentiment?.score && !rawFlows.length) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setNarrativeLoading(true);
      api.desk
        .getGeneralMarketsNarrative({
          sentiment,
          flows: rawFlows.slice(0, 16),
          flowMode,
          brief: brief || deskData?.brief,
        })
        .then((res) => {
          if (active) setAiNarrative(res?.data || null);
        })
        .catch(() => {
          if (active) setAiNarrative(null);
        })
        .finally(() => {
          if (active) setNarrativeLoading(false);
        });
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    sentiment?.score,
    sentiment?.asOf,
    flowMode,
    rawFlows.map((f) => `${f.ticker}:${f.pct}`).join('|'),
    brief,
    deskData?.brief,
  ]);
  const flowSource = merged.capitalFlows?.source;
  const flowSourceText = flowSourceLabel(flowSource);
  const flowSourceClass = String(flowSource || 'live').replace(/[^a-z0-9_]/gi, '_');
  const deskLive = merged.live;
  const liveTimeLabel = formatDeskLiveTime(merged.sentiment?.asOf || merged.capitalFlows?.asOf);

  const pastDateLabel = useMemo(() => pastEventsHeaderDate(pastEvents), [pastEvents]);

  if (loading && !deskData && !Object.keys(prices).length) {
    return (
      <div className="desk-gm" role="tabpanel">
        <DeskPanelSkeleton variant="gauge" />
        <DeskPanelSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="desk-gm desk-gm--mrkt" role="tabpanel">
      <div className="desk-gm__live-bar" aria-live="polite">
        <span className={`desk-gm__live-dot ${deskLive ? 'desk-gm__live-dot--on' : ''}`} aria-hidden />
        <span className="desk-gm__live-label">
          {deskLive ? 'Live desk' : 'Awaiting live tape'}
          {liveTimeLabel ? ` · ${liveTimeLabel}` : ''}
        </span>
      </div>

      <div className="desk-gm__top-grid">
        <article className="desk-gm__card desk-gm__card--sentiment">
          <div className="desk-gm__card-head">
            <h3 className="desk-gm__card-title">
              MRKT AI Sentiment Index
              <button
                type="button"
                className="desk-gm__info-btn"
                title="Score from live VIX, indices, and desk regime"
              >
                <Info size={13} strokeWidth={2} />
              </button>
              {claudeActive && (
                <span className="desk-gm__claude-pill">
                  <Sparkles size={10} aria-hidden />
                  Claude
                </span>
              )}
            </h3>
            {sentiment?.regimeLabel && (
              <span className={`desk-gm__regime desk-gm__regime--${tone}`}>{sentiment.regimeLabel}</span>
            )}
          </div>

          <p className="desk-gm__summary">
            {narrativeLoading && !displaySentimentSummary ? (
              <span className="desk-gm__summary-loading">Updating desk read…</span>
            ) : (
              displaySentimentSummary
            )}
          </p>

          <div className="desk-gm__sentiment-body">
            <SentimentGauge score={sentiment?.score ?? 50} label={sentiment?.label ?? 'Balanced'} tone={tone} />
            <ul className="desk-gm__factors">
              {(sentiment?.factors || []).map((f) => (
                <FactorRow key={f.label} factor={f} />
              ))}
            </ul>
          </div>
        </article>

        <article className="desk-gm__card desk-gm__card--past">
          <div className="desk-gm__card-head">
            <h3 className="desk-gm__card-title desk-gm__card-title--past">Past Events</h3>
            {onRefresh && (
              <button type="button" className="desk-panel-refresh" onClick={onRefresh} aria-label="Refresh">
                <RefreshCw size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="desk-gm__past-date-bar"
            onClick={() => setPastDateOpen((v) => !v)}
            aria-expanded={pastDateOpen}
          >
            <span>{pastDateLabel}</span>
            <ChevronDown size={15} className={pastDateOpen ? 'desk-gm__chev--open' : ''} />
          </button>

          {pastDateOpen && (
            <div className="desk-gm__past-list custom-scrollbar">
              {eventsLoading && !pastEvents.length ? (
                <div className="desk-gm__events-loading">
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  Loading schedule…
                </div>
              ) : pastEvents.length ? (
                <ul className="desk-gm__past-events">
                  {pastEvents.map((ev) => (
                    <PastEventRow key={ev.id} ev={ev} />
                  ))}
                </ul>
              ) : (
                <div className="desk-gm__events-empty-block">
                  <p className="desk-panel-muted desk-gm__events-empty">
                    {syncError || 'No past events on calendar — sync macro data.'}
                  </p>
                  <button
                    type="button"
                    className="desk-gm__events-sync-link desk-gm__events-sync-btn"
                    onClick={handleSyncCalendar}
                    disabled={syncingCal}
                  >
                    {syncingCal ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Syncing…
                      </>
                    ) : (
                      <>
                        Sync calendar <ArrowRight size={11} />
                      </>
                    )}
                  </button>
                </div>
              )}
              <div className="desk-gm__events-foot">
                <Link to="/dashboard/calendar" className="desk-gm__events-sync-link">
                  Full calendar <ArrowRight size={11} />
                </Link>
                <button
                  type="button"
                  className="desk-gm__events-sync-btn desk-gm__events-sync-btn--ghost"
                  onClick={handleSyncCalendar}
                  disabled={syncingCal}
                >
                  <RefreshCw size={11} className={syncingCal ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>
          )}
        </article>
      </div>

      <article className="desk-gm__card desk-gm__card--flows">
        <div className="desk-gm__card-head desk-gm__card-head--flows">
          <h3 className="desk-gm__card-title">
            {flowMode === 'haven' ? 'Safe Haven Assets' : 'Capital Flows'}
            <button
              type="button"
              className="desk-gm__info-btn"
              title={
                flowMode === 'haven'
                  ? 'FXY, FXF, GLD and defensive ETFs — live Yahoo session %'
                  : 'Sector ETF session % — live Yahoo + desk tape'
              }
            >
              <Info size={13} strokeWidth={2} />
            </button>
            {flowSourceText && (
              <span className={`desk-gm__flow-source desk-gm__flow-source--${flowSourceClass}`}>
                {flowSourceText}
              </span>
            )}
          </h3>
          <div className="desk-gm__toggle" role="group" aria-label="Flow view">
            <button type="button" className={flowMode === 'liquidity' ? 'on' : ''} onClick={() => setFlowMode('liquidity')}>
              Liquidity
            </button>
            <button type="button" className={flowMode === 'haven' ? 'on' : ''} onClick={() => setFlowMode('haven')}>
              Safe Haven
            </button>
          </div>
        </div>

        {displayFlowSummary && (
          <p className="desk-gm__flow-summary">
            {narrativeLoading && !aiNarrative?.flowSummary ? (
              <span className="desk-gm__summary-loading">Updating flow narrative…</span>
            ) : (
              displayFlowSummary
            )}
          </p>
        )}

        {!merged.capitalFlows?.live && flowsAreFlat(rawFlows) ? (
          <div className="desk-gm__flows-awaiting">
            <p className="desk-panel-muted">
              Sector flows update in real time from ES, NQ, CL, and DXY session change. Waiting for live tape…
            </p>
          </div>
        ) : null}

        <ul className="desk-gm__flows desk-gm__flows--div">
          {flows.map((row) => (
            <DivergingFlowRow
              key={row.ticker}
              row={row}
              maxAbs={maxAbs}
              rank={flowRanks.get(row.ticker)}
            />
          ))}
        </ul>
      </article>
    </div>
  );
};

export default DeskGeneralMarketsTab;

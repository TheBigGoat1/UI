/**
 * Economic calendar: recurring macro schedule + optional Finnhub / FMP APIs.
 */

const COUNTRY_META = {
  US: { label: "United States", currency: "USD" },
  EU: { label: "Eurozone", currency: "EUR" },
  GB: { label: "United Kingdom", currency: "GBP" },
  JP: { label: "Japan", currency: "JPY" },
  AU: { label: "Australia", currency: "AUD" },
  CA: { label: "Canada", currency: "CAD" },
  CH: { label: "Switzerland", currency: "CHF" },
  NZ: { label: "New Zealand", currency: "NZD" },
  CN: { label: "China", currency: "CNY" },
};

/** Approximate FOMC decision dates (announcement 19:00 UTC) */
const FOMC_BY_YEAR = {
  2023: ["2023-02-01", "2023-03-22", "2023-05-03", "2023-06-14", "2023-07-26", "2023-09-20", "2023-11-01", "2023-12-13"],
  2024: ["2024-01-31", "2024-03-20", "2024-05-01", "2024-06-12", "2024-07-31", "2024-09-18", "2024-11-07", "2024-12-18"],
  2025: ["2025-01-29", "2025-03-19", "2025-05-07", "2025-06-18", "2025-07-30", "2025-09-17", "2025-11-05", "2025-12-17"],
  2026: ["2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17", "2026-07-29", "2026-09-16", "2026-11-04", "2026-12-16"],
  2027: ["2027-01-27", "2027-03-17", "2027-04-28", "2027-06-16", "2027-07-28", "2027-09-15", "2027-11-03", "2027-12-15"],
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function atUtc(y, m, d, hour = 12, minute = 0) {
  return new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
}

function firstWeekdayOfMonth(year, month, weekday) {
  const d = new Date(Date.UTC(year, month - 1, 1));
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.getUTCDate();
}

function nthWeekdayOfMonth(year, month, weekday, n) {
  let day = firstWeekdayOfMonth(year, month, weekday);
  day += (n - 1) * 7;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > last) day -= 7;
  return day;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function eachMonth(from, to, fn) {
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth() + 1;
  const endY = to.getUTCFullYear();
  const endM = to.getUTCMonth() + 1;
  while (y < endY || (y === endY && m <= endM)) {
    fn(y, m);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
}

function pushEvent(list, { country, name, impact, time, forecast, previous, description }) {
  const meta = COUNTRY_META[country] || {};
  const id = `gen-${country}-${slug(name)}-${time.toISOString().slice(0, 16)}`;
  list.push({
    provider_event_id: id,
    country,
    event: name,
    impact,
    forecast: forecast ?? null,
    previous: previous ?? null,
    actual: null,
    event_time: time,
    description:
      description ||
      `${name} (${meta.label || country}) — ${impact} impact. Currency: ${meta.currency || "—"}.`,
    currency: meta.currency || null,
  });
}

/**
 * Generate recurring macro events between two dates (inclusive months).
 */
export function generateMacroCalendar(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const events = [];

  eachMonth(from, to, (year, month) => {
    const dim = daysInMonth(year, month);

    // —— United States ——
    const nfpDay = nthWeekdayOfMonth(year, month, 5, 1);
    pushEvent(events, {
      country: "US",
      name: "Non-Farm Payrolls",
      impact: "HIGH",
      time: atUtc(year, month, nfpDay, 13, 30),
      forecast: "180K",
      previous: "175K",
    });
    pushEvent(events, {
      country: "US",
      name: "Unemployment Rate",
      impact: "HIGH",
      time: atUtc(year, month, nfpDay, 13, 30),
      forecast: "3.9%",
      previous: "3.8%",
    });

    const cpiDay = Math.min(15, dim);
    pushEvent(events, {
      country: "US",
      name: "CPI m/m",
      impact: "HIGH",
      time: atUtc(year, month, cpiDay, 13, 30),
      forecast: "0.3%",
      previous: "0.2%",
    });
    pushEvent(events, {
      country: "US",
      name: "Core CPI m/m",
      impact: "HIGH",
      time: atUtc(year, month, cpiDay, 13, 30),
      forecast: "0.2%",
      previous: "0.3%",
    });

    const retailDay = Math.min(17, dim);
    pushEvent(events, {
      country: "US",
      name: "Retail Sales m/m",
      impact: "MEDIUM",
      time: atUtc(year, month, retailDay, 13, 30),
      forecast: "0.4%",
      previous: "0.6%",
    });

    const pceDay = Math.min(dim - 2, 28);
    if (pceDay > 0) {
      pushEvent(events, {
        country: "US",
        name: "Core PCE Price Index m/m",
        impact: "HIGH",
        time: atUtc(year, month, pceDay, 13, 30),
        forecast: "0.2%",
        previous: "0.1%",
      });
    }

    pushEvent(events, {
      country: "US",
      name: "ISM Manufacturing PMI",
      impact: "MEDIUM",
      time: atUtc(year, month, Math.min(3, dim), 15, 0),
      forecast: "49.5",
      previous: "48.7",
    });

    pushEvent(events, {
      country: "US",
      name: "ISM Services PMI",
      impact: "MEDIUM",
      time: atUtc(year, month, Math.min(5, dim), 15, 0),
      forecast: "52.0",
      previous: "51.4",
    });

    if (month % 3 === 0) {
      const gdpDay = Math.min(dim - 5, 28);
      pushEvent(events, {
        country: "US",
        name: "Advance GDP q/q",
        impact: "HIGH",
        time: atUtc(year, month, gdpDay, 13, 30),
        forecast: "2.0%",
        previous: "1.9%",
      });
    }

    for (let d = 1; d <= dim; d++) {
      const dt = atUtc(year, month, d, 13, 30);
      if (dt.getUTCDay() === 4) {
        for (let d2 = d; d2 <= dim; d2 += 7) {
          pushEvent(events, {
            country: "US",
            name: "Initial Jobless Claims",
            impact: "MEDIUM",
            time: atUtc(year, month, d2, 13, 30),
            forecast: "220K",
            previous: "218K",
          });
        }
        break;
      }
    }

    // FOMC — include policy rate consensus fields for desk rate path + trend sparklines
    const fomcDates = FOMC_BY_YEAR[year] || [];
    for (const iso of fomcDates) {
      const [y, m, d] = iso.split("-").map(Number);
      if (m === month && y === year) {
        const fedRate =
          y >= 2026 ? "4.25%" : y >= 2025 ? "4.50%" : y >= 2024 ? "5.25%" : "5.50%";
        const fedPrev =
          y >= 2026 && m >= 6 ? "4.50%" : y >= 2025 ? "4.50%" : y >= 2024 ? "5.50%" : "5.50%";
        pushEvent(events, {
          country: "US",
          name: "FOMC Rate Decision",
          impact: "HIGH",
          time: atUtc(y, m, d, 19, 0),
          forecast: fedRate,
          previous: fedPrev,
        });
        pushEvent(events, {
          country: "US",
          name: "FOMC Statement",
          impact: "HIGH",
          time: atUtc(y, m, d, 19, 0),
          forecast: fedRate,
          previous: fedPrev,
        });
        pushEvent(events, {
          country: "US",
          name: "Fed Chair Press Conference",
          impact: "HIGH",
          time: atUtc(y, m, d, 19, 30),
        });
      }
    }

    // —— Eurozone ——
    const ecbDay = nthWeekdayOfMonth(year, month, 4, 2);
    if (month % 2 === 0) {
      pushEvent(events, {
        country: "EU",
        name: "ECB Main Refinancing Rate",
        impact: "HIGH",
        time: atUtc(year, month, ecbDay, 12, 45),
        forecast: "4.00%",
        previous: "4.00%",
      });
      pushEvent(events, {
        country: "EU",
        name: "ECB Press Conference",
        impact: "HIGH",
        time: atUtc(year, month, ecbDay, 13, 30),
      });
    }

    pushEvent(events, {
      country: "EU",
      name: "CPI y/y",
      impact: "HIGH",
      time: atUtc(year, month, Math.min(19, dim), 10, 0),
      forecast: "2.4%",
      previous: "2.6%",
    });

    const zewDay = nthWeekdayOfMonth(year, month, 2, 2);
    pushEvent(events, {
      country: "EU",
      name: "German ZEW Economic Sentiment",
      impact: "MEDIUM",
      time: atUtc(year, month, zewDay, 10, 0),
      forecast: "12.5",
      previous: "10.2",
    });

    // —— UK ——
    if (month % 2 === 1) {
      pushEvent(events, {
        country: "GB",
        name: "BoE Official Bank Rate",
        impact: "HIGH",
        time: atUtc(year, month, nthWeekdayOfMonth(year, month, 4, 1), 12, 0),
        forecast: "5.00%",
        previous: "5.00%",
      });
    }

    pushEvent(events, {
      country: "GB",
      name: "CPI y/y",
      impact: "HIGH",
      time: atUtc(year, month, Math.min(20, dim), 7, 0),
      forecast: "2.1%",
      previous: "2.3%",
    });

    pushEvent(events, {
      country: "GB",
      name: "GDP m/m",
      impact: "MEDIUM",
      time: atUtc(year, month, Math.min(13, dim), 7, 0),
      forecast: "0.1%",
      previous: "0.0%",
    });

    // —— Japan ——
    if (month % 3 === 1) {
      pushEvent(events, {
        country: "JP",
        name: "BoJ Policy Rate",
        impact: "HIGH",
        time: atUtc(year, month, Math.min(18, dim), 3, 0),
        forecast: "0.10%",
        previous: "0.10%",
      });
    }

    pushEvent(events, {
      country: "JP",
      name: "Tokyo CPI y/y",
      impact: "MEDIUM",
      time: atUtc(year, month, Math.min(27, dim), 23, 30),
      forecast: "2.5%",
      previous: "2.4%",
    });

    // —— Australia ——
    pushEvent(events, {
      country: "AU",
      name: "Employment Change",
      impact: "MEDIUM",
      time: atUtc(year, month, Math.min(14, dim), 0, 30),
      forecast: "25.0K",
      previous: "30.5K",
    });

    pushEvent(events, {
      country: "AU",
      name: "RBA Cash Rate",
      impact: "HIGH",
      time: atUtc(year, month, Math.min(7, dim), 4, 30),
      forecast: "4.35%",
      previous: "4.35%",
    });

    // —— Canada ——
    if (month % 2 === 0) {
      pushEvent(events, {
        country: "CA",
        name: "BoC Overnight Rate",
        impact: "HIGH",
        time: atUtc(year, month, Math.min(12, dim), 14, 15),
        forecast: "4.50%",
        previous: "4.50%",
      });
    }

    pushEvent(events, {
      country: "CA",
      name: "Employment Change",
      impact: "MEDIUM",
      time: atUtc(year, month, nthWeekdayOfMonth(year, month, 5, 1), 13, 30),
      forecast: "15.0K",
      previous: "12.0K",
    });

    // —— Switzerland ——
    if (month % 3 === 0) {
      pushEvent(events, {
        country: "CH",
        name: "SNB Policy Rate",
        impact: "HIGH",
        time: atUtc(year, month, Math.min(21, dim), 8, 30),
        forecast: "1.50%",
        previous: "1.50%",
      });
    }

    // —— New Zealand ——
    if (month % 2 === 1) {
      pushEvent(events, {
        country: "NZ",
        name: "RBNZ Official Cash Rate",
        impact: "HIGH",
        time: atUtc(year, month, Math.min(22, dim), 1, 0),
        forecast: "5.50%",
        previous: "5.50%",
      });
    }

    // —— China ——
    if (month % 3 === 0) {
      pushEvent(events, {
        country: "CN",
        name: "GDP y/y",
        impact: "HIGH",
        time: atUtc(year, month, Math.min(18, dim), 2, 0),
        forecast: "5.0%",
        previous: "4.9%",
      });
    }

    pushEvent(events, {
      country: "CN",
      name: "Manufacturing PMI",
      impact: "MEDIUM",
      time: atUtc(year, month, Math.min(1, dim), 1, 30),
      forecast: "50.2",
      previous: "49.8",
    });
  });

  return events.filter((e) => e.event_time >= from && e.event_time <= to);
}

export async function fetchFinnhubCalendar(from, to) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return [];

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  const url = `https://finnhub.io/api/v1/calendar/economic?from=${fromStr}&to=${toStr}&token=${token}`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": "INSIDR/1.0" } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.economicCalendar || []).map((row) => {
      const country = String(row.country || "US").slice(0, 2).toUpperCase();
      const time = row.time
        ? new Date(row.time)
        : atUtc(
            Number(row.date?.slice(0, 4)) || 2025,
            Number(row.date?.slice(5, 7)) || 1,
            Number(row.date?.slice(8, 10)) || 1,
            12,
            0,
          );
      const impact =
        row.impact === 3 ? "HIGH" : row.impact === 2 ? "MEDIUM" : "LOW";
      return {
        provider_event_id: `finnhub-${row.event}-${time.toISOString().slice(0, 10)}-${country}`,
        country,
        event: row.event || "Economic Release",
        impact,
        forecast: row.estimate != null ? String(row.estimate) : null,
        previous: row.prev != null ? String(row.prev) : null,
        actual: row.actual != null ? String(row.actual) : null,
        event_time: time,
        description: row.unit ? `Unit: ${row.unit}` : null,
        currency: row.currency || null,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchFmpCalendar(from, to) {
  const key = process.env.FMP_API_KEY;
  if (!key) return [];

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromStr}&to=${toStr}&apikey=${key}`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": "INSIDR/1.0" } });
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json)) return [];

    return json.map((row) => {
      const country = String(row.country || "US").slice(0, 2).toUpperCase();
      const time = new Date(row.date);
      const impact = String(row.impact || "Medium").toUpperCase();
      return {
        provider_event_id: `fmp-${slug(row.event || "event")}-${row.date}-${country}`,
        country,
        event: row.event || "Economic Release",
        impact: impact.includes("HIGH") ? "HIGH" : impact.includes("LOW") ? "LOW" : "MEDIUM",
        forecast: row.estimate != null ? String(row.estimate) : null,
        previous: row.previous != null ? String(row.previous) : null,
        actual: row.actual != null ? String(row.actual) : null,
        event_time: time,
        description: null,
        currency: null,
      };
    });
  } catch {
    return [];
  }
}

export function mergeCalendarEvents(sources) {
  const map = new Map();
  for (const list of sources) {
    for (const ev of list) {
      if (!ev.provider_event_id) continue;
      const existing = map.get(ev.provider_event_id);
      if (!existing || (ev.actual && !existing.actual)) {
        map.set(ev.provider_event_id, ev);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.event_time - b.event_time);
}

export async function buildCalendarRange(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  const generated = generateMacroCalendar(from, to);
  const [finnhub, fmp] = await Promise.all([
    fetchFinnhubCalendar(from, to),
    fetchFmpCalendar(from, to),
  ]);

  return mergeCalendarEvents([generated, finnhub, fmp]);
}

export function defaultSyncRange() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear() - 2, 0, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear() + 2, 11, 31, 23, 59, 59));
  return { from, to };
}

export { COUNTRY_META };

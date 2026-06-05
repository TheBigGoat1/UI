/**
 * Chart overlay layout — even Y distribution and collision avoidance (MRKT-style).
 */

export function computeChartPriceRange(bars, extraPrices = []) {
  let min = Infinity;
  let max = -Infinity;

  for (const b of bars || []) {
    if (Number.isFinite(b?.low)) min = Math.min(min, b.low);
    if (Number.isFinite(b?.high)) max = Math.max(max, b.high);
  }
  for (const p of extraPrices) {
    if (Number.isFinite(p)) {
      min = Math.min(min, p);
      max = Math.max(max, p);
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    const mid = extraPrices.find(Number.isFinite) || 100;
    return { min: mid * 0.988, max: mid * 1.012 };
  }

  const span = max - min || max * 0.01;
  return { min: min - span * 0.06, max: max + span * 0.06 };
}

export function priceToYPercent(price, min, max) {
  if (!Number.isFinite(price) || max <= min) return 50;
  const pct = ((max - price) / (max - min)) * 100;
  return Math.min(92, Math.max(8, pct));
}

/** Enforce minimum vertical gap between sorted Y values. */
export function distributeYPositions(items, minGap = 6, bounds = { min: 8, max: 92 }) {
  if (!items.length) return items;
  const sorted = items
    .map((item, idx) => ({ ...item, _idx: idx }))
    .sort((a, b) => (a.y ?? a.top) - (b.y ?? b.top));

  const out = sorted.map((item) => ({ ...item, y: item.y ?? item.top }));
  for (let i = 1; i < out.length; i++) {
    const gap = out[i].y - out[i - 1].y;
    if (gap < minGap) out[i].y = Math.min(bounds.max, out[i - 1].y + minGap);
  }

  if (out[out.length - 1].y > bounds.max) {
    const shift = out[out.length - 1].y - bounds.max;
    for (let i = 0; i < out.length; i++) {
      out[i].y = Math.max(bounds.min, out[i].y - shift);
    }
  }

  const result = [...items];
  out.forEach(({ _idx, y }) => {
    result[_idx] = { ...result[_idx], y, top: y };
  });
  return result;
}

/** Even horizontal slots across chart width. */
export function distributeHorizontalSlots(count, padLeft = 14, padRight = 10) {
  if (count <= 0) return [];
  const span = 100 - padLeft - padRight;
  if (count === 1) return [padLeft + span / 2];
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, i) => padLeft + i * step);
}

/** Stagger markers that share the same bar region; spread Y globally. */
export function distributeChartMarkers(markers, minGap = 6) {
  if (!markers.length) return markers;
  const result = markers.map((m) => ({ ...m }));

  const buckets = new Map();
  result.forEach((m, i) => {
    const key = `${Math.round(m.left / 4)}|${Math.round(m.top / 4)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(i);
  });

  buckets.forEach((indices) => {
    if (indices.length <= 1) return;
    indices.forEach((idx, slot) => {
      const offset = (slot - (indices.length - 1) / 2) * minGap;
      result[idx].top = Math.min(88, Math.max(12, result[idx].top + offset));
      result[idx].left = Math.min(86, Math.max(14, result[idx].left + slot * 2.5 - indices.length));
    });
  });

  return distributeYPositions(
    result.map((m, i) => ({ ...m, y: m.top, _idx: i })),
    7,
  );
}

/** Level lines with staggered Y and alternating label sides. */
export function distributeLevelLines(levels, minGap = 7) {
  const withY = levels.map((l) => ({ ...l }));
  const distributed = distributeYPositions(
    withY.map((l, i) => ({ y: l.y, _idx: i })),
    minGap,
  );
  distributed.forEach((d, i) => {
    withY[i].y = d.y ?? d.top;
    withY[i].labelSide = i % 2 === 0 ? 'right' : 'left';
  });
  return withY;
}

/** Fallback positions when news cannot be time-mapped to bars. */
export function distributeFallbackPositions(count) {
  const lefts = distributeHorizontalSlots(count, 16, 12);
  const topPattern = [22, 38, 54, 68, 32, 46, 60, 26];
  return lefts.map((left, i) => ({
    left,
    top: topPattern[i % topPattern.length],
  }));
}

/**
 * Spread floating label positions so hover callouts do not overlap (MRKT-style).
 * Anchors stay on the candle; only labelX/labelY are adjusted.
 */
export function distributeNewsLabelFloats(markers, minGap = 10) {
  if (!markers.length) return markers;
  const result = markers.map((m) => ({ ...m }));

  const spreadGroup = (indices, verticalKey) => {
    if (indices.length <= 1) return;
    indices.sort((a, b) => result[a].anchorX - result[b].anchorX);
    for (let i = 1; i < indices.length; i++) {
      const prev = result[indices[i - 1]];
      const cur = result[indices[i]];
      const gap = cur[verticalKey] - prev[verticalKey];
      if (Math.abs(gap) < minGap) {
        if (cur.side === 'above') {
          cur[verticalKey] = prev[verticalKey] - minGap;
        } else {
          cur[verticalKey] = prev[verticalKey] + minGap;
        }
      }
      cur[verticalKey] = Math.min(90, Math.max(8, cur[verticalKey]));
      if (cur.side === 'above') {
        cur.labelX = Math.min(88, Math.max(12, cur.anchorX + (i % 2 === 0 ? 8 : -6)));
      } else {
        cur.labelX = Math.min(88, Math.max(12, cur.anchorX + (i % 2 === 0 ? 10 : -4)));
      }
    }
  };

  const aboveIdx = result.map((m, i) => (m.side === 'above' ? i : -1)).filter((i) => i >= 0);
  const belowIdx = result.map((m, i) => (m.side === 'below' ? i : -1)).filter((i) => i >= 0);
  spreadGroup(aboveIdx, 'labelY');
  spreadGroup(belowIdx, 'labelY');

  return result;
}

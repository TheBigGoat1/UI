const DEFAULTS = {
  marketStructure: true,
  supportResistance: true,
  orderBlocks: true,
  pocLevels: true,
  psychologicalLevels: true,
  harmonics: true,
  liquidity: true,
  sma: true,
  fibonacci: true,
  rsiDivergence: true,
};

export function parseEngineModules(query = {}) {
  const raw = query.modules;
  if (!raw) return { ...DEFAULTS };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULTS };
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

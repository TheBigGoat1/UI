export const ENGINE_KEY = 'insidr_engine_modules';

export const defaultEngineModules = {
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

export function loadEngineModules() {
  try {
    const raw = localStorage.getItem(ENGINE_KEY);
    if (!raw) return { ...defaultEngineModules };
    return { ...defaultEngineModules, ...JSON.parse(raw) };
  } catch {
    return { ...defaultEngineModules };
  }
}

export function engineModulesQueryValue() {
  return JSON.stringify(loadEngineModules());
}

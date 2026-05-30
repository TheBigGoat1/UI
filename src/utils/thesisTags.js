export const THESIS_TAGS = [
  { id: 'plan', label: 'Following the plan' },
  { id: 'fomo', label: 'FOMO / impulse' },
  { id: 'revenge', label: 'Revenge trade' },
];

export function thesisTagLabel(id) {
  if (!id) return null;
  const hit = THESIS_TAGS.find((t) => t.id === id);
  if (hit) return hit.label;
  return String(id);
}

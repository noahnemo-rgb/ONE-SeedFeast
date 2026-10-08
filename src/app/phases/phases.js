export const phases = [
  { slug: 'planting', label: 'Phase 1 - Planting' },
  { slug: 'growing', label: 'Phase 2 - Growing' },
  { slug: 'harvesting', label: 'Phase 3 - Harvesting' },
  { slug: 'storing', label: 'Phase 4 - Storing' },
  { slug: 'preserving', label: 'Phase 5 - Preserving' },
];

export function phaseBySlug(slug) {
  const phase = phases.find((entry) => entry.slug === slug);
  if (!phase) {
    throw new Error(`Unknown phase: ${slug}`);
  }
  return phase;
}

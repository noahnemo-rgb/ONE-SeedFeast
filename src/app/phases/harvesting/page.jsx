import { PhaseHold } from '../hold';
import { phaseBySlug } from '../phases';

const phase = phaseBySlug('harvesting');

export default function HarvestingPhasePage() {
  return <PhaseHold label={phase.label} />;
}

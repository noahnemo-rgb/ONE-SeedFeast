import { PhaseHold } from '../hold';
import { phaseBySlug } from '../phases';

const phase = phaseBySlug('preserving');

export default function PreservingPhasePage() {
  return <PhaseHold label={phase.label} />;
}

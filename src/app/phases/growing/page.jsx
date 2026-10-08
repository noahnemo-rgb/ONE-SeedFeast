import { PhaseHold } from '../hold';
import { phaseBySlug } from '../phases';

const phase = phaseBySlug('growing');

export default function GrowingPhasePage() {
  return <PhaseHold label={phase.label} />;
}

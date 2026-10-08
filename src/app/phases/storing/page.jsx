import { PhaseHold } from '../hold';
import { phaseBySlug } from '../phases';

const phase = phaseBySlug('storing');

export default function StoringPhasePage() {
  return <PhaseHold label={phase.label} />;
}

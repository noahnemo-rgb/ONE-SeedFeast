import { PhaseHold } from '../hold';
import { phaseBySlug } from '../phases';

const phase = phaseBySlug('planting');

export default function PlantingPhasePage() {
  return <PhaseHold label={phase.label} />;
}

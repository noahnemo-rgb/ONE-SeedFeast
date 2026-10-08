import { useEffect } from 'react';
import { AppFrame } from '../components/frame';

export function PhaseHold({ label }) {
  useEffect(() => {
    document.title = label;
  }, [label]);

  return (
    <AppFrame showTabs>
      <header className="border-b border-[#F3F4F6] bg-white px-5 py-6">
        <h1 className="font-display text-2xl font-semibold">{label}</h1>
      </header>
    </AppFrame>
  );
}

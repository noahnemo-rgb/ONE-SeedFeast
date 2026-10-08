import { NavLink } from 'react-router';
import { Bookmark, Home, Leaf, Search, User } from 'lucide-react';
import { phases } from '../phases/phases';

const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/seeds', label: 'Seeds', icon: Leaf },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/profile', label: 'Profile', icon: User },
];

function PhaseNav() {
  return (
    <nav className="sticky top-0 z-20 border-b border-[#EDEDED] bg-white">
      <div className="flex gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {phases.map((phase) => (
          <NavLink
            key={phase.slug}
            to={`/phases/${phase.slug}`}
            className={({ isActive }) =>
              `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium ${
                isActive ? 'bg-[#FFF1E8] text-[#FF6A3D]' : 'text-[#8C8C8C]'
              }`
            }
          >
            {phase.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function AppFrame({ children, showTabs = false, tone = 'app' }) {
  const background = tone === 'white' ? 'bg-white' : tone === 'cook' ? 'bg-[#f6f1e7]' : 'bg-[#F8F8F8]';
  return (
    <div className={`relative mx-auto min-h-screen w-full max-w-[480px] ${background} text-[#111111] shadow-[0_0_40px_rgba(0,0,0,0.06)]`}>
      {showTabs ? <PhaseNav /> : null}
      <div className={showTabs ? 'pb-24' : ''}>{children}</div>
      {showTabs ? (
        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[480px] -translate-x-1/2 border-t border-[#EDEDED] bg-white px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className="flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-medium"
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} color={isActive ? '#FF6A3D' : '#8C8C8C'} strokeWidth={2} />
                    <span className={isActive ? 'text-[#FF6A3D]' : 'text-[#8C8C8C]'}>{tab.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

export function Spinner({ className = '' }) {
  return (
    <div className={`flex flex-1 items-center justify-center py-16 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF6A3D] border-t-transparent" />
    </div>
  );
}

export function GreenSpinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#10B981] border-t-transparent" />
    </div>
  );
}

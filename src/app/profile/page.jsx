import { BookOpen, LogOut, Plus, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { AppFrame } from '../components/frame';
import { useSession } from '../components/session';

export default function ProfileScreen() {
  const { user, isAuthenticated, isReady, signOut } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!isReady) {
    return (
      <AppFrame showTabs tone="white">
        <p className="py-24 text-center text-[#8C8C8C]">Loading...</p>
      </AppFrame>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppFrame showTabs>
        <div className="flex flex-col items-center px-8 py-24 text-center">
          <div className="mb-8 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <User size={64} color="#8C8C8C" strokeWidth={1.5} />
          </div>
          <h1 className="mb-3 text-2xl font-semibold">Sign In to Continue</h1>
          <p className="mb-8 whitespace-pre-line text-base leading-6 text-[#6B7280]">
            {'Create an account to save recipes,\nshare your creations, and more'}
          </p>
          <Link to="/account/signin" className="rounded-full bg-[#FF6A3D] px-12 py-4 text-base font-semibold text-white">
            Sign In
          </Link>
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame showTabs>
      <div className="px-5 py-6">
        <h1 className="font-display mb-6 text-[28px] font-semibold">Profile</h1>
        <div className="mb-6 rounded-[20px] bg-white px-6 py-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#FF6A3D]">
            <User size={40} color="#FFFFFF" />
          </div>
          <p className="text-xl font-semibold">{user?.name || 'Food Lover'}</p>
          <p className="mt-1 text-sm text-[#8C8C8C]">{user?.email}</p>
        </div>

        <div className="mb-6 flex flex-col gap-3">
          <MenuLink to="/create-recipe" icon={<Plus size={20} color="#FFFFFF" />} tint="#FF6A3D" title="Create Recipe" subtitle="Share your cooking creations" />
          <MenuLink to="/my-recipes" icon={<BookOpen size={20} color="#FFFFFF" />} tint="#2E7D32" title="My Recipes" subtitle="View recipes you've created" />
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            className="flex items-center rounded-2xl bg-white p-4 text-left shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
          >
            <span className="mr-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: '#1976D2' }}>
              <Settings size={20} color="#FFFFFF" />
            </span>
            <span>
              <span className="block text-base font-semibold">Settings</span>
              <span className="text-[13px] text-[#8C8C8C]">Manage your preferences</span>
            </span>
          </button>
          {settingsOpen ? (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm text-[#6B7280]">
              Notification and diet preferences are not available yet. Your sign-in stays in this browser session.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FFE5E5] bg-white p-4 text-base font-semibold text-[#FF3B30]"
        >
          <LogOut size={20} color="#FF3B30" />
          Sign Out
        </button>
      </div>
    </AppFrame>
  );
}

function MenuLink({ to, icon, tint, title, subtitle }) {
  return (
    <Link to={to} className="flex items-center rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <span className="mr-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: tint }}>
        {icon}
      </span>
      <span>
        <span className="block text-base font-semibold">{title}</span>
        <span className="text-[13px] text-[#8C8C8C]">{subtitle}</span>
      </span>
    </Link>
  );
}

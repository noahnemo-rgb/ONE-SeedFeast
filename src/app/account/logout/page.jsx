import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AppFrame } from '../../components/frame';
import { useSession } from '../../components/session';

export default function LogoutPage() {
  const { signOut, isReady } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isReady) return;
    signOut().finally(() => navigate('/account/signin'));
  }, [isReady, signOut, navigate]);

  return (
    <AppFrame>
      <p className="flex min-h-screen items-center justify-center text-[#8C8C8C]">Signing out...</p>
    </AppFrame>
  );
}

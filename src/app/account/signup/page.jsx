import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AppFrame } from '../../components/frame';
import { useSession } from '../../components/session';

const errorMessages = {
  EmailCreateAccount: 'This email can\'t be used. It may already be registered.',
  CredentialsSignin: 'Invalid email or password. If you already have an account, try signing in instead.',
};

export default function SignUpPage() {
  const { signUp } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signUp({ email, password, name });
      navigate('/');
    } catch (err) {
      setError(errorMessages[err.message] || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <AppFrame>
      <form onSubmit={handleSubmit} className="flex min-h-screen items-center px-4">
        <div className="w-full rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="font-display text-2xl font-semibold">Create account</h1>
          <p className="mt-2 text-sm text-[#8C8C8C]">Accounts stay on SeedFeast for this visit.</p>
          <label className="mt-6 block text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input id="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl bg-[#F3F4F6] px-4 py-3" />
          <label className="mt-4 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl bg-[#F3F4F6] px-4 py-3" />
          <label className="mt-4 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl bg-[#F3F4F6] px-4 py-3" />
          {error ? <p className="mt-4 text-sm text-[#FF3B30]">{error}</p> : null}
          <button type="submit" disabled={loading} className="mt-6 w-full rounded-full bg-[#FF6A3D] py-3.5 font-semibold text-white disabled:opacity-60">
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
          <p className="mt-4 text-center text-sm text-[#6B7280]">
            Already cooking?{' '}
            <Link to="/account/signin" className="font-semibold text-[#FF6A3D]">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AppFrame>
  );
}

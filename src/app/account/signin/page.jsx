import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AppFrame } from '../../components/frame';
import { useSession } from '../../components/session';

const errorMessages = {
  CredentialsSignin: 'Incorrect email or password. Try again or reset your password.',
  EmailCreateAccount: "This email can't be used to create an account. It may already exist.",
  Configuration: "Sign-in isn't working right now. Please try again later.",
};

export default function SignInPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
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
      await signIn({ email, password });
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
          <h1 className="font-display text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-[#8C8C8C]">Save recipes, share what you cook, and list seeds.</p>
          <label className="mt-6 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl bg-[#F3F4F6] px-4 py-3"
          />
          <label className="mt-4 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl bg-[#F3F4F6] px-4 py-3"
          />
          {error ? <p className="mt-4 text-sm text-[#FF3B30]">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-[#FF6A3D] py-3.5 font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="mt-4 text-center text-sm text-[#6B7280]">
            New here?{' '}
            <Link to="/account/signup" className="font-semibold text-[#FF6A3D]">
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </AppFrame>
  );
}

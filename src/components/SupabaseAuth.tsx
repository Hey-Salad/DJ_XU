import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '../services/data/supabaseClient';
import LogoEN from '../assets/DJ_XU_EN.svg';

const supabase = getSupabaseClient();

const formStates = {
  login: {
    title: 'Log in with Supabase',
    description: 'Continue with email and password to reach the dashboard.',
    action: 'Log in',
  },
  signup: {
    title: 'Create a Supabase account',
    description: 'Sign up with email + password to unlock organizational controls.',
    action: 'Sign up',
  },
} as const;

export default function SupabaseAuth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || undefined,
            },
          },
        });
        if (error) {
          throw error;
        }
        setFeedback(
          'Success! Check your inbox for a confirmation link before logging in.'
        );
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          throw error;
        }
        setFeedback('Logged in! You can now enjoy the DJ XU experience.');
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unexpected error happened.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-lg shadow-black/10">
      <div className="mb-4 flex flex-col items-center justify-center">
        <img src={LogoEN} alt="DJ XU" className="h-24 w-24 mb-4" />
        <h2 className="text-3xl font-semibold text-black">{formStates[mode].title}</h2>
        <p className="text-sm text-zinc-400 text-center">{formStates[mode].description}</p>
        <button
          className="mt-3 rounded-full border border-black/20 px-4 py-1 text-xs uppercase tracking-[0.25em] text-black/80 transition hover:text-black"
          type="button"
          onClick={() =>
            setMode((prev) => (prev === 'login' ? 'signup' : 'login'))
          }
        >
          Switch to {mode === 'login' ? 'sign up' : 'log in'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="text-sm font-medium text-zinc-200">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </label>

        <label className="text-sm font-medium text-zinc-200">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </label>

        {mode === 'signup' && (
          <label className="text-sm font-medium text-zinc-200">
            Display name (optional)
            <input
              type="text"
              value={displayName}
              onChange={(ev) => setDisplayName(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </label>
        )}

        {error && (
          <p className="text-sm text-red-400">
            {error}
          </p>
        )}
        {feedback && (
          <p className="text-sm text-green-400">
            {feedback}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-900 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Working…' : formStates[mode].action}
        </button>
        <div className="mt-4 text-center text-xs uppercase tracking-[0.3em] text-gray-400">
          Don't have an account?{' '}
          <button
            type="button"
            className="text-[#ff4b2b] hover:underline"
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>
      </form>
    </section>
  );
}

import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setSubmitting(true);

    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);

    if (err) {
      setError(err);
      setSubmitting(false);
      return;
    }

    if (mode === 'signup') {
      setInfoMsg('Account created. You can sign in now.');
      setSubmitting(false);
    }
    // On successful sign-in, the AuthProvider's session listener takes over
    // and the app switches away from this screen automatically.
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setInfoMsg(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D1117] px-4 text-gray-100">
      <div className="w-full max-w-md rounded-2xl border border-[#30363D] bg-[#161B22] p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981] to-[#00E699] shadow-lg shadow-emerald-500/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-7 w-7 text-[#0D1117]"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9" />
              <path d="M3 12h9" />
              <path d="m9 3 3 9" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            FollowUp<span className="text-[#10B981]">Manager</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Stay on top of every conversation that matters.</p>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg border border-[#30363D] bg-[#0D1117] p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
              mode === 'signin' ? 'bg-[#10B981]/10 text-[#10B981]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
              mode === 'signup' ? 'bg-[#10B981]/10 text-[#10B981]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-gray-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-gray-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 p-2.5 text-xs text-[#10B981]">
              {infoMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#00E699] py-2.5 text-sm font-bold text-[#0D1117] transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Please wait...
              </>
            ) : mode === 'signin' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-gray-500">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={switchMode} type="button" className="font-semibold text-[#10B981] hover:underline">
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthScreen;

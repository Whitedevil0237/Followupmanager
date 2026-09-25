import { useEffect, useState } from 'react';
import { Bell, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function Header() {
  const { user, signOut } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#30363D] py-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981] to-[#00E699] shadow-lg shadow-emerald-500/20">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-[#0D1117]"
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
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
            FollowUp<span className="text-[#10B981]">Manager</span>
          </h1>
          <p className="text-xs text-gray-500">AI Client Relations Platform</p>
        </div>
      </div>

      <div className="hidden flex-col items-end text-right md:flex">
        <span className="text-sm font-medium text-gray-300">{dateStr}</span>
        <span className="font-mono text-xs text-[#10B981]">{timeStr}</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#30363D] bg-[#161B22] text-gray-400 transition-colors hover:border-[#10B981]/50 hover:text-[#10B981]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#10B981] ring-2 ring-[#161B22]" />
        </button>
        {user && (
          <div className="hidden items-center gap-2 rounded-lg border border-[#30363D] bg-[#161B22] px-3 py-2 sm:flex">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#10B981] to-[#00E699] text-[#0D1117]">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="max-w-[140px] truncate text-xs text-gray-300">{user.email}</span>
          </div>
        )}
        <button
          onClick={() => void signOut()}
          title="Sign out"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#30363D] bg-[#161B22] text-gray-400 transition-colors hover:border-red-500/50 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

export default Header;

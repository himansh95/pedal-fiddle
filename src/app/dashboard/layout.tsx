'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  Activity,
  Bike,
  Bot,
  ChevronRight,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
  Zap,
} from 'lucide-react';
import Image from 'next/image';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/ai', label: 'AI Config', icon: Bot },
  { href: '/dashboard/rules', label: 'Hide Rules', icon: EyeOff },
  { href: '/dashboard/gear', label: 'Gear Rules', icon: Bike },
  { href: '/dashboard/logs', label: 'Activity Logs', icon: Activity },
  { href: '/dashboard/strava', label: 'Strava', icon: Zap },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar whenever the route changes (user tapped a nav link)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-800/60">
        <span className="text-2xl">🚴</span>
        <span className="text-lg font-bold tracking-tight text-white">Pedal <span className="text-orange-400">Fiddle</span></span>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="ml-auto rounded-md p-1 text-zinc-500 hover:text-white md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-zinc-800/60 p-4">
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt="Avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white">
              {session?.user?.name?.[0] ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {session?.user?.name ?? 'Athlete'}
            </p>
            <p className="text-xs text-zinc-500">Connected</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            title="Sign out"
            className="rounded-md p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-transparent text-white">

      {/* Desktop sidebar — always visible on md+ */}
      <aside
        className="hidden md:flex w-60 flex-col border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm"
        style={{ backgroundImage: 'radial-gradient(ellipse 120% 80% at -20% -10%, rgba(252,76,2,0.07) 0%, transparent 60%)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-800/60 bg-zinc-950 transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundImage: 'radial-gradient(ellipse 120% 80% at -20% -10%, rgba(252,76,2,0.07) 0%, transparent 60%)' }}
      >
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-zinc-800/60 bg-zinc-950/80 px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-base font-bold tracking-tight text-white">
            Pedal <span className="text-orange-400">Fiddle</span>
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

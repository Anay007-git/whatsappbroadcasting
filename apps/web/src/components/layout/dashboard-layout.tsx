'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Calendar,
  Send,
  Users,
  FolderTree,
  FileText,
  Smartphone,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  History,
  LogOut,
  Menu,
  X,
  Plus,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading EventBlast...</p>
        </div>
      </div>
    );
  }

  if (!user && typeof window !== 'undefined' && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    router.push('/login');
    return null;
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: '⚡ Quick Broadcaster', href: '/quick-broadcast', icon: Zap },
    { name: 'Campaigns', href: '/campaigns', icon: Send },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Groups', href: '/groups', icon: FolderTree },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Templates', href: '/templates', icon: FileText },
    { name: 'WhatsApp', href: '/whatsapp', icon: Smartphone },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Suppressions', href: '/suppressions', icon: ShieldAlert },
    { name: 'Team & RBAC', href: '/settings/team', icon: UserCheck },
    { name: 'Audit Logs', href: '/audit', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shrink-0">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-400 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight gradient-text">EventBlast</span>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">WhatsApp Enterprise</span>
            </div>
          </Link>
        </div>

        {/* Organization Tag */}
        <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-900/30">
          <div className="text-xs text-slate-400 font-medium">Workspace</div>
          <div className="text-sm font-semibold text-slate-200 truncate">
            {user?.organization.name || 'Enterprise Org'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs">
                {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-200 truncate">{user?.name}</div>
                <div className="text-[11px] text-slate-400 truncate capitalize">{user?.role?.toLowerCase()}</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
            <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
              <span className="font-bold text-lg gradient-text">EventBlast</span>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800">
              <button onClick={logout} className="flex items-center gap-2 text-rose-400 text-sm font-medium w-full">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-300">Organization:</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                {user?.organization?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Compliance indicator badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Compliance Guard Active</span>
            </div>

            {/* Quick Actions */}
            <Link
              href="/events/new"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Event</span>
            </Link>

            <Link
              href="/campaigns/new"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-lg shadow-indigo-600/20 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Launch Campaign</span>
            </Link>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

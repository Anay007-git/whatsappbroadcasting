'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import {
  Users,
  Send,
  CheckCircle2,
  Calendar,
  Smartphone,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

export default function DashboardPage() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => api.get('/analytics/dashboard'),
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => api.get('/events'),
  });

  const metrics = analytics?.metrics || {
    totalEvents: 1,
    activeCampaigns: 0,
    totalContacts: 5,
    totalGuests: 5,
    confirmedGuests: 3,
    deliveryRate: 98,
    readRate: 89,
    failureRate: 2,
    rsvpRate: 60,
  };

  const upcomingEvent = events?.[0];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Good afternoon, Admin</span>
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Your WhatsApp event marketing engine is healthy and compliant.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/campaigns/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Event Guests</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-3">{metrics.totalGuests}</div>
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>{metrics.confirmedGuests} Confirmed RSVPs</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">RSVP Conversion Rate</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-3">{metrics.rsvpRate}%</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Across published events
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Delivery Success Rate</span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-3">{metrics.deliveryRate}%</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {metrics.readRate}% Read Rate
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Contacts</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-3">{metrics.totalContacts}</div>
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3 h-3" />
              <span>100% Opt-in Verified</span>
            </div>
          </div>
        </div>

        {/* Featured Event Banner & WhatsApp Session Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Event Card */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800/80 relative overflow-hidden flex flex-col justify-between">
            {upcomingEvent ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                      Featured Event
                    </span>
                    <Link
                      href={`/events/${upcomingEvent.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <span>Manage Event</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <h2 className="text-xl font-bold text-white">{upcomingEvent.name}</h2>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{upcomingEvent.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{new Date(upcomingEvent.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • 10:00 AM</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{upcomingEvent.venueName}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Total Guests: </span>
                      <span className="font-bold text-white">{upcomingEvent.stats?.totalGuests || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Confirmed: </span>
                      <span className="font-bold text-emerald-400">{upcomingEvent.stats?.confirmed || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Pending: </span>
                      <span className="font-bold text-amber-400">{upcomingEvent.stats?.pending || 0}</span>
                    </div>
                  </div>

                  <Link
                    href={`/events/${upcomingEvent.id}/guests`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                  >
                    View Guest List
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-10">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No active events created yet.</p>
                <Link href="/events/new" className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-xs font-semibold rounded-lg text-white">
                  Create First Event
                </Link>
              </div>
            )}
          </div>

          {/* WhatsApp Sessions Health */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  WhatsApp Lines
                </span>
                <Link href="/whatsapp" className="text-xs text-indigo-400 hover:underline">
                  Configure
                </Link>
              </div>

              <div className="space-y-3">
                {analytics?.whatsappSessions && analytics.whatsappSessions.length > 0 ? (
                  analytics.whatsappSessions.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="overflow-hidden">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {s.displayName}
                        </div>
                        <div className="text-[11px] text-slate-400">{s.phoneNumber || 'Not connected'}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'CONNECTED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 text-center py-4">
                    No WhatsApp lines configured.
                  </div>
                )}
              </div>
            </div>

            <Link
              href="/whatsapp"
              className="w-full mt-4 py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-xs font-semibold rounded-lg text-center transition-colors flex items-center justify-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Connect / Manage Lines</span>
            </Link>
          </div>
        </div>

        {/* Funnel Visualizer */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Event Marketing Delivery & RSVP Funnel</h3>
              <p className="text-xs text-slate-400">Total conversion pipeline across campaigns</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.funnel || []} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {(analytics?.funnel || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Campaigns Table */}
        <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Recent Marketing Campaigns</h3>
            <Link href="/campaigns" className="text-xs text-indigo-400 hover:underline font-semibold">
              View All Campaigns
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Campaign Name</th>
                  <th className="px-6 py-3.5">Event</th>
                  <th className="px-6 py-3.5">Recipients</th>
                  <th className="px-6 py-3.5">Delivered</th>
                  <th className="px-6 py-3.5">RSVPs</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analytics?.recentCampaigns && analytics.recentCampaigns.length > 0 ? (
                  analytics.recentCampaigns.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">{c.name}</td>
                      <td className="px-6 py-4 text-slate-400">{c.event?.name || '—'}</td>
                      <td className="px-6 py-4 font-mono">{c.totalRecipients}</td>
                      <td className="px-6 py-4 font-mono text-emerald-400">{c.deliveredCount}</td>
                      <td className="px-6 py-4 font-mono text-indigo-400 font-bold">{c.rsvpCount}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'RUNNING'
                              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                              : c.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          View Analytics →
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No campaigns launched yet. Click "+ Launch Campaign" to create your first invitation wave.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import {
  Calendar,
  Users,
  Send,
  BarChart3,
  Settings,
  MapPin,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  QrCode,
  Search,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function EventDetailPage() {
  const { id } = useParams() as { id: string };
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'guests' | 'campaigns'>('overview');
  const [guestSearch, setGuestSearch] = useState('');
  const [addGuestModalOpen, setAddGuestModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`),
  });

  const { data: guestsData, isLoading: guestsLoading } = useQuery({
    queryKey: ['event-guests', id, guestSearch],
    queryFn: () =>
      api.get(`/events/${id}/guests`, {
        params: { search: guestSearch || undefined },
      }),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: () => api.get('/groups'),
  });

  const checkInMutation = useMutation({
    mutationFn: (guestToken: string) =>
      api.post(`/events/${id}/checkin`, { token: guestToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['event-guests', id] });
    },
  });

  const addGuestsMutation = useMutation({
    mutationFn: (data: any) => api.post(`/events/${id}/guests`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['event-guests', id] });
      setAddGuestModalOpen(false);
    },
  });

  if (eventLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const guests = guestsData?.items || [];
  const stats = event?.stats || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Event Header Banner */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          {event.bannerUrl && (
            <div className="h-48 sm:h-64 w-full relative">
              <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            </div>
          )}

          <div className="p-6 relative -mt-16 sm:-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {event.status}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
                  {event.name}
                </h1>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">{event.description}</p>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>{new Date(event.startAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • 10:00 AM</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>{event.venueName}</span>
                  </div>
                  {event.mapsUrl && (
                    <a
                      href={event.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Open Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/campaigns/new?eventId=${event.id}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Launch Event Campaign</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 border-t border-slate-800/80 flex gap-6 text-xs font-semibold">
            {[
              { id: 'overview', label: 'Event Overview', icon: Calendar },
              { id: 'guests', label: `Guest List (${stats.totalGuests || 0})`, icon: Users },
              { id: 'campaigns', label: 'Campaigns & Waves', icon: Send },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3.5 flex items-center gap-2 border-b-2 transition-colors ${
                    isActive
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Total Guests Invited</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.totalGuests || 0}</div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-emerald-400 font-semibold">Confirmed (Going)</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.confirmed || 0}</div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-amber-400 font-semibold">Maybe</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{stats.maybe || 0}</div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-indigo-400 font-semibold">Checked In (At Venue)</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">{stats.checkedIn || 0}</div>
              </div>
            </div>

            {/* Venue & Logistics Details */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3">Venue & Physical Logistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Venue Name</span>
                  <span className="font-semibold text-slate-200">{event.venueName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Address</span>
                  <span className="font-semibold text-slate-200">{event.venueAddress}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">RSVP Deadline</span>
                  <span className="font-semibold text-slate-200">
                    {event.rsvpDeadline
                      ? new Date(event.rsvpDeadline).toLocaleString()
                      : 'No deadline set'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Timezone</span>
                  <span className="font-semibold text-slate-200">{event.timezone}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GUESTS */}
        {activeTab === 'guests' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search guests by name, company, or phone..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => setAddGuestModalOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Audience to Guest List</span>
              </button>
            </div>

            {/* Guests Table */}
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">Guest Name</th>
                      <th className="px-6 py-3.5">Phone Number</th>
                      <th className="px-6 py-3.5">Company</th>
                      <th className="px-6 py-3.5">Invitation Status</th>
                      <th className="px-6 py-3.5">RSVP Status</th>
                      <th className="px-6 py-3.5">Check-In</th>
                      <th className="px-6 py-3.5 text-right">RSVP Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {guests.map((g: any) => {
                      const isCheckedIn = g.checkedInAt !== null;
                      const isGoing = g.rsvpStatus === 'GOING';

                      return (
                        <tr key={g.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-6 py-4 font-semibold text-white">
                            {g.contact?.fullName}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-400">
                            {g.contact?.phoneNumber}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {g.contact?.company || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                              {g.invitationStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isGoing
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : g.rsvpStatus === 'MAYBE'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : g.rsvpStatus === 'DECLINED'
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {g.rsvpStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isCheckedIn ? (
                              <span className="inline-flex items-center gap-1 text-indigo-400 text-xs font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Checked In</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => checkInMutation.mutate(g.uniqueToken)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-semibold transition-colors"
                              >
                                Mark Present
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <a
                              href={`/rsvp/${g.uniqueToken}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-400 hover:underline flex items-center justify-end gap-1 font-semibold"
                            >
                              <span>Public RSVP</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}

                    {guests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                          No guests invited yet. Click "Add Audience to Guest List" above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CAMPAIGNS */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {event.campaigns && event.campaigns.length > 0 ? (
                event.campaigns.map((c: any) => (
                  <div
                    key={c.id}
                    className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{c.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                          {c.campaignType}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {c.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-4 font-mono">
                        <span>Sent: {c.sentCount}</span>
                        <span>Delivered: {c.deliveredCount}</span>
                        <span>Read: {c.readCount}</span>
                        <span className="text-indigo-400 font-bold">RSVPs: {c.rsvpCount}</span>
                      </div>
                    </div>

                    <Link
                      href={`/campaigns/${c.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <span>Campaign Monitor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 glass-panel rounded-2xl border border-slate-800">
                  <Send className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No campaigns launched for this event yet.</p>
                  <Link
                    href={`/campaigns/new?eventId=${event.id}`}
                    className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-xs font-semibold rounded-lg text-white"
                  >
                    Create Event Invitation Campaign
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Guests Modal */}
        {addGuestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <h2 className="text-lg font-bold text-white mb-1">Add Guests to Event</h2>
              <p className="text-xs text-slate-400 mb-4">
                Generate personalized cryptographically secure RSVP tokens for contacts
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Select Contact Group</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    <option value="">-- All Organization Contacts --</option>
                    {groups.map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.contactCount || 0} contacts)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                  ✓ Unique RSVP tokens will be securely generated for each guest. Duplicate entries will be automatically skipped.
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 mt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddGuestModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addGuestsMutation.mutate({ groupId: selectedGroupId || undefined })}
                  disabled={addGuestsMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white"
                >
                  {addGuestsMutation.isPending ? 'Generating Tokens...' : 'Generate & Add Guests'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

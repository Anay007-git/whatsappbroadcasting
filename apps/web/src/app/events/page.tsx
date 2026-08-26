'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import { Calendar, Plus, MapPin, Clock, Users, CheckCircle2, ArrowRight } from 'lucide-react';

export default function EventsPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-400" />
              <span>Event Management</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Create and manage corporate summits, trade expos, product launches, and gala dinners
            </p>
          </div>

          <Link
            href="/events/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Event</span>
          </Link>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((e: any) => (
            <div
              key={e.id}
              className="glass-panel rounded-2xl border border-slate-800 hover:border-slate-700 transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Event Banner */}
                {e.bannerUrl ? (
                  <div className="h-44 w-full bg-slate-800 relative overflow-hidden">
                    <img src={e.bannerUrl} alt={e.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-emerald-400 border border-slate-700">
                      {e.status}
                    </span>
                  </div>
                ) : (
                  <div className="h-28 bg-gradient-to-r from-indigo-900/40 to-slate-900 p-4 flex items-end">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-emerald-400 border border-slate-700">
                      {e.status}
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-lg font-bold text-white line-clamp-1">{e.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{e.description}</p>

                  <div className="mt-4 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{new Date(e.startAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {new Date(e.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{e.venueName}</span>
                    </div>
                  </div>

                  {/* RSVP Metrics Pillbox */}
                  <div className="grid grid-cols-4 gap-2 mt-5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400">Total</div>
                      <div className="text-xs font-bold text-white">{e.stats?.totalGuests || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-400">Going</div>
                      <div className="text-xs font-bold text-emerald-400">{e.stats?.confirmed || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-amber-400">Maybe</div>
                      <div className="text-xs font-bold text-amber-400">{e.stats?.maybe || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-indigo-400">Checked In</div>
                      <div className="text-xs font-bold text-indigo-400">{e.stats?.checkedIn || 0}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex items-center justify-between border-t border-slate-800/60 mt-4">
                <Link
                  href={`/events/${e.id}`}
                  className="w-full mt-4 py-2 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Open Event Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

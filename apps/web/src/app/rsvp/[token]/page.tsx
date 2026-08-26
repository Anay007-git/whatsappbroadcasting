'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Download,
  ExternalLink,
  Sparkles,
  Users,
  AlertCircle,
} from 'lucide-react';

export default function PublicRsvpPage() {
  const { token } = useParams() as { token: string };
  const queryClient = useQueryClient();

  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);

  const { data: rsvpData, isLoading, error } = useQuery({
    queryKey: ['public-rsvp', token],
    queryFn: () => api.get(`/rsvp/${token}`),
    retry: false,
  });

  const respondMutation = useMutation({
    mutationFn: (status: string) =>
      api.post(`/rsvp/${token}/respond`, {
        status,
        guestCount,
        notes: notes || undefined,
      }),
    onSuccess: (res: any) => {
      setSubmittedStatus(res.status);
      queryClient.invalidateQueries({ queryKey: ['public-rsvp', token] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !rsvpData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-white">Invitation Not Found</h1>
          <p className="text-xs text-slate-400">
            This invitation link is invalid, expired, or has been revoked by the organizer.
          </p>
        </div>
      </div>
    );
  }

  const { event, guest, rsvp } = rsvpData;
  const currentStatus = submittedStatus || (rsvp?.status !== 'PENDING' ? rsvp?.status : null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg glass-panel rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden relative z-10">
        {/* Event Banner */}
        {event.bannerUrl && (
          <div className="h-48 sm:h-56 w-full relative overflow-hidden">
            <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[11px] font-semibold text-slate-200 border border-slate-700">
              {event.organizer}
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          {/* Personalized Greeting */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official WhatsApp Invitation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-2">
              Hello {guest.firstName}
            </h1>
            <p className="text-xs text-slate-400">
              You are cordially invited to attend
            </p>
            <h2 className="text-lg font-bold text-indigo-300 pt-1">
              {event.name}
            </h2>
          </div>

          {/* Event Schedule & Venue Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">
                  {new Date(event.startAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {new Date(event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} onwards
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-slate-800/60">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">{event.venueName}</div>
                <div className="text-slate-400 text-[11px] leading-relaxed">{event.venueAddress}</div>
                {event.mapsUrl && (
                  <a
                    href={event.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-400 hover:underline font-semibold mt-1"
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Confirmation View vs Response Form */}
          {currentStatus === 'GOING' ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-300">
                  Thank you, {guest.firstName}!
                </h3>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Your attendance has been confirmed. We look forward to seeing you at the event.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <a
                  href={`/api/rsvp/${token}/ics`}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Add to Calendar (.ics)</span>
                </a>
                {event.mapsUrl && (
                  <a
                    href={event.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Get Directions</span>
                  </a>
                )}
              </div>
            </div>
          ) : currentStatus === 'DECLINED' ? (
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
              <XCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <h3 className="text-sm font-bold text-rose-300">Attendance Declined</h3>
              <p className="text-xs text-rose-200/70">
                Thank you for letting us know, {guest.firstName}. We hope to see you at future events!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider text-center">
                Will you be attending?
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate('GOING')}
                  className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex flex-col items-center gap-1 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✓ I'll Attend</span>
                </button>

                <button
                  type="button"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate('MAYBE')}
                  className="py-3 px-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Maybe</span>
                </button>

                <button
                  type="button"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate('DECLINED')}
                  className="py-3 px-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Can't Attend</span>
                </button>
              </div>

              {/* Guest count & optional note */}
              <div className="pt-2 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total guests in your party:</span>
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value, 10))}
                    className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                  >
                    <option value={1}>1 (Just Me)</option>
                    <option value={2}>2 (Myself + 1)</option>
                    <option value={3}>3 (Myself + 2)</option>
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Dietary requests or notes for organizer (optional)..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800/80 text-center text-[10px] text-slate-500">
          Powered by EventBlast WhatsApp Marketing • End-to-End Encrypted Event RSVP
        </div>
      </div>
    </div>
  );
}

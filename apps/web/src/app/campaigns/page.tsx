'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import {
  Send,
  Plus,
  Play,
  Pause,
  StopCircle,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export default function CampaignsPage() {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns'),
    refetchInterval: 4000,
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/pause`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/resume`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const emergencyStopMutation = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/emergency-stop`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Send className="w-6 h-6 text-indigo-400" />
              <span>WhatsApp Campaigns</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Create, schedule, track, and manage WhatsApp event invitation and reminder waves
            </p>
          </div>

          <Link
            href="/campaigns/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch New Campaign</span>
          </Link>
        </div>

        {/* Campaigns List */}
        <div className="space-y-4">
          {campaigns.map((c: any) => {
            const isRunning = c.status === 'RUNNING';
            const isPaused = c.status === 'PAUSED';
            const isCompleted = c.status === 'COMPLETED';
            const progress = c.totalRecipients > 0 ? Math.round((c.sentCount / c.totalRecipients) * 100) : 0;

            return (
              <div
                key={c.id}
                className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {c.campaignType}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isRunning
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 pulse-dot'
                            : isCompleted
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : isPaused
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{c.name}</h3>
                    <p className="text-xs text-slate-400">
                      Event: <span className="text-slate-200 font-medium">{c.event?.name || 'General Campaign'}</span> • Session: <span className="font-mono text-slate-300">{c.whatsappSession?.displayName}</span>
                    </p>
                  </div>

                  {/* Operational Controls */}
                  <div className="flex items-center gap-2">
                    {isRunning && (
                      <button
                        onClick={() => pauseMutation.mutate(c.id)}
                        className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    )}

                    {isPaused && (
                      <button
                        onClick={() => resumeMutation.mutate(c.id)}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                    )}

                    {(isRunning || isPaused) && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to trigger EMERGENCY STOP for this campaign?')) {
                            emergencyStopMutation.mutate(c.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        <span>Emergency Stop</span>
                      </button>
                    )}

                    <Link
                      href={`/campaigns/${c.id}`}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Live Monitor</span>
                    </Link>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">
                      Progress: <span className="font-bold text-slate-200">{c.sentCount}</span> / {c.totalRecipients} Messages Dispatched
                    </span>
                    <span className="font-mono text-indigo-400 font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Pillbox */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">Audience</div>
                    <div className="font-bold text-white mt-0.5">{c.totalRecipients}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] text-sky-400">Sent</div>
                    <div className="font-bold text-sky-400 mt-0.5">{c.sentCount}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] text-emerald-400">Delivered</div>
                    <div className="font-bold text-emerald-400 mt-0.5">{c.deliveredCount}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] text-cyan-400">Read</div>
                    <div className="font-bold text-cyan-400 mt-0.5">{c.readCount}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] text-purple-400">RSVPs</div>
                    <div className="font-bold text-purple-400 mt-0.5">{c.rsvpCount}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {campaigns.length === 0 && (
            <div className="text-center py-12 glass-panel rounded-2xl border border-slate-800">
              <Send className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-300">No marketing campaigns created yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Launch your first invitation wave to reach your opted-in contacts via WhatsApp
              </p>
              <Link
                href="/campaigns/new"
                className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-xs font-semibold rounded-lg text-white"
              >
                Create First Campaign
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import {
  Send,
  ArrowLeft,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Smartphone,
  Calendar,
  CheckCheck,
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

export default function CampaignDetailPage() {
  const { id } = useParams() as { id: string };
  const queryClient = useQueryClient();

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`),
    refetchInterval: 3000,
  });

  const { data: analytics } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: () => api.get(`/analytics/campaigns/${id}`),
    refetchInterval: 3000,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['campaign-messages', id],
    queryFn: () => api.get('/messages', { params: { campaignId: id, limit: 50 } }),
    refetchInterval: 3000,
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.post(`/campaigns/${id}/pause`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign', id] }),
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.post(`/campaigns/${id}/resume`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign', id] }),
  });

  const emergencyStopMutation = useMutation({
    mutationFn: () => api.post(`/campaigns/${id}/emergency-stop`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign', id] }),
  });

  const retryMessageMutation = useMutation({
    mutationFn: (msgId: string) => api.post(`/messages/${msgId}/retry`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign-messages', id] }),
  });

  if (campaignLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const isRunning = campaign.status === 'RUNNING';
  const isPaused = campaign.status === 'PAUSED';
  const isCompleted = campaign.status === 'COMPLETED';
  const progress = campaign.totalRecipients > 0 ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100) : 0;
  const messages = messagesData?.items || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/campaigns" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Campaigns</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1 flex items-center gap-2">
              <span>{campaign.name}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isRunning
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 pulse-dot'
                    : isCompleted
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : isPaused
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {campaign.status}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Event: <span className="text-slate-200 font-semibold">{campaign.event?.name || 'General Campaign'}</span> • WhatsApp Line: <span className="font-mono text-slate-300">{campaign.whatsappSession?.displayName}</span>
            </p>
          </div>

          {/* Operational Controls */}
          <div className="flex items-center gap-2">
            {isRunning && (
              <button
                onClick={() => pauseMutation.mutate()}
                className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Campaign</span>
              </button>
            )}

            {isPaused && (
              <button
                onClick={() => resumeMutation.mutate()}
                className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume Dispatch</span>
              </button>
            )}

            {(isRunning || isPaused) && (
              <button
                onClick={() => {
                  if (confirm('Trigger EMERGENCY STOP? Pending messages will be cancelled immediately.')) {
                    emergencyStopMutation.mutate();
                  }
                }}
                className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Emergency Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">
              Live Dispatch Progress ({campaign.sentCount} of {campaign.totalRecipients} dispatched)
            </span>
            <span className="font-mono text-indigo-400 font-bold text-sm">{progress}%</span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2 text-center text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">Total Audience</div>
              <div className="text-base font-bold text-white mt-0.5">{campaign.totalRecipients}</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-sky-400">Sent</div>
              <div className="text-base font-bold text-sky-400 mt-0.5">{campaign.sentCount}</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-emerald-400">Delivered</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">{campaign.deliveredCount}</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-cyan-400">Read</div>
              <div className="text-base font-bold text-cyan-400 mt-0.5">{campaign.readCount}</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-purple-400">RSVPs</div>
              <div className="text-base font-bold text-purple-400 mt-0.5">{campaign.rsvpCount}</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-rose-400">Failed</div>
              <div className="text-base font-bold text-rose-400 mt-0.5">{campaign.failedCount}</div>
            </div>
          </div>
        </div>

        {/* Funnel Chart */}
        {analytics?.funnel && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-1">Campaign Conversion Funnel</h3>
            <p className="text-xs text-slate-400 mb-4">Pipeline transition from WhatsApp delivery to confirmed RSVP</p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.funnel} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <XAxis dataKey="step" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Message Queue Logs */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Live Message Queue & Delivery Receipts</h3>
            <span className="text-xs text-slate-400 font-mono">Auto-refreshing</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Recipient</th>
                  <th className="px-6 py-3.5">Phone (E.164)</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Provider Message ID</th>
                  <th className="px-6 py-3.5">Delivered At</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {messages.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">
                      {m.contact?.fullName}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {m.contact?.phoneNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'DELIVERED' || m.status === 'READ'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : m.status === 'SENT'
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : m.status === 'FAILED'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                      {m.providerMessageId ? m.providerMessageId.slice(0, 20) + '...' : '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {m.deliveredAt ? new Date(m.deliveredAt).toLocaleTimeString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {m.status === 'FAILED' && (
                        <button
                          onClick={() => retryMessageMutation.mutate(m.id)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          Retry Send
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

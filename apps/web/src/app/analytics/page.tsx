'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import { BarChart3, TrendingUp, Users, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => api.get('/analytics/dashboard'),
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
    totalSent: 5,
    totalDelivered: 5,
    totalRead: 4,
  };

  const deliveryPieData = [
    { name: 'Delivered & Read', value: metrics.totalRead, fill: '#06b6d4' },
    { name: 'Delivered Unread', value: Math.max(0, metrics.totalDelivered - metrics.totalRead), fill: '#10b981' },
    { name: 'Failed / Bounced', value: metrics.totalFailed || 0, fill: '#f43f5e' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <span>Platform Analytics & Campaign Intelligence</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Analyze WhatsApp messaging performance, delivery health, and RSVP attendee conversions
          </p>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-400">Total Delivery Rate</div>
            <div className="text-2xl font-bold text-white mt-2">{metrics.deliveryRate}%</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">High delivery score</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-400">WhatsApp Read Rate</div>
            <div className="text-2xl font-bold text-cyan-400 mt-2">{metrics.readRate}%</div>
            <div className="text-[11px] text-slate-400 mt-1">Average across campaigns</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-400">RSVP Conversion Rate</div>
            <div className="text-2xl font-bold text-indigo-400 mt-2">{metrics.rsvpRate}%</div>
            <div className="text-[11px] text-indigo-300 mt-1">Confirmed attendance</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-400">Failure / Bounce Rate</div>
            <div className="text-2xl font-bold text-rose-400 mt-2">{metrics.failureRate}%</div>
            <div className="text-[11px] text-slate-400 mt-1">Suppression filtered</div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-1">Full Delivery to RSVP Conversion Funnel</h3>
            <p className="text-xs text-slate-400 mb-4">Total aggregate pipeline metrics across all campaigns</p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.funnel || []} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {(analytics?.funnel || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Delivery Composition</h3>
              <p className="text-xs text-slate-400 mb-4">Read vs Delivered ratio</p>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deliveryPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                    >
                      {deliveryPieData.map((entry, index) => (
                        <Cell key={`pie-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-4 border-t border-slate-800">
              {deliveryPieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-slate-300">{d.name}</span>
                  </div>
                  <span className="font-bold text-white font-mono">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

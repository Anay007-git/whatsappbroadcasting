'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import { History, ShieldCheck, User, Clock, Terminal } from 'lucide-react';

export default function AuditLogsPage() {
  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit', { params: { limit: 50 } }),
  });

  const logs = auditData?.items || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" />
            <span>Audit & Compliance Trail</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable system logs tracking operator actions, campaign launches, WhatsApp connectivity, and contact imports
          </p>
        </div>

        {/* Audit Log Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Resource</th>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Metadata / Details</th>
                  <th className="px-6 py-3.5">IP Address</th>
                  <th className="px-6 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-indigo-300 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {log.resourceType}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-200">{log.user?.name || 'System Operator'}</div>
                      <div className="text-[10px] text-slate-400">{log.user?.email || '—'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No audit events logged yet.
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

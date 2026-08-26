'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import { ShieldAlert, Plus, Download, Trash2, X, AlertCircle } from 'lucide-react';

export default function SuppressionsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reason, setReason] = useState('User requested opt-out');
  const [error, setError] = useState<string | null>(null);

  const { data: suppressionsData, isLoading } = useQuery({
    queryKey: ['suppressions'],
    queryFn: () => api.get('/suppressions'),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/suppressions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppressions'] });
      setModalOpen(false);
      setPhoneNumber('');
      setReason('User requested opt-out');
    },
    onError: (err: any) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppressions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppressions'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    addMutation.mutate({ phoneNumber, reason });
  };

  const entries = suppressionsData?.items || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
              <span>Opt-Out & Suppression Registry</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Maintain an active suppression list to prevent unwanted marketing messages and ensure regulatory compliance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/suppressions/export/csv"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Suppression List</span>
            </a>

            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Suppressed Number</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Phone Number (E.164)</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Source</th>
                  <th className="px-6 py-3.5">Suppressed Since</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entries.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {item.phoneNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{item.reason}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-400">
                        {item.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => removeMutation.mutate(item.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}

                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No suppressed phone numbers in the registry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-white mb-1">Add to Suppression List</h2>
              <p className="text-xs text-slate-400 mb-4">
                Blocked numbers will be automatically excluded from all future campaigns
              </p>

              {error && (
                <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number (E.164) *</label>
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Suppression Reason *</label>
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Recipient requested removal"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addMutation.isPending}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg"
                  >
                    {addMutation.isPending ? 'Adding...' : 'Add to Suppression'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

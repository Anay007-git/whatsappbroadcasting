'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import {
  Smartphone,
  Plus,
  RefreshCw,
  Power,
  QrCode,
  Send,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  X,
  ShieldCheck,
} from 'lucide-react';

export default function WhatsAppPage() {
  const queryClient = useQueryClient();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedSessionForQr, setSelectedSessionForQr] = useState<any>(null);

  // Form states
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newProvider, setNewProvider] = useState('MOCK');
  const [testSessionId, setTestSessionId] = useState('');
  const [testPhone, setTestPhone] = useState('+919876543210');
  const [testMessage, setTestMessage] = useState('Hello from EventBlast! This is a test WhatsApp message.');
  const [testResult, setTestResult] = useState<any>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['whatsapp-sessions'],
    queryFn: () => api.get('/whatsapp/sessions'),
    refetchInterval: 5000,
  });

  const createSessionMutation = useMutation({
    mutationFn: (data: any) => api.post('/whatsapp/sessions', data),
    onSuccess: (newSession: any) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
      setConnectModalOpen(false);
      setSelectedSessionForQr(newSession);
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: (id: string) => api.post(`/whatsapp/sessions/${id}/start`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] }),
  });

  const stopSessionMutation = useMutation({
    mutationFn: (id: string) => api.post(`/whatsapp/sessions/${id}/stop`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] }),
  });

  const syncStatusMutation = useMutation({
    mutationFn: (id: string) => api.post(`/whatsapp/sessions/${id}/sync`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] }),
  });

  const testSendMutation = useMutation({
    mutationFn: (data: any) => api.post('/whatsapp/sessions/test-send', data),
    onSuccess: (res: any) => {
      setTestResult({ success: true, data: res });
    },
    onError: (err: any) => {
      setTestResult({ success: false, error: err.message });
    },
  });

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    createSessionMutation.mutate({
      displayName: newDisplayName,
      provider: newProvider,
    });
  };

  const handleTestSend = (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    testSendMutation.mutate({
      whatsappSessionId: testSessionId,
      phoneNumber: testPhone,
      messageContent: testMessage,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-emerald-400" />
              <span>WhatsApp Session Management</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Connect and manage multiple WhatsApp gateway lines via OpenWA or mock simulator
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTestModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              <span>Send Test Message</span>
            </button>

            <button
              onClick={() => setConnectModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect WhatsApp Number</span>
            </button>
          </div>
        </div>

        {/* Compliance & Policy Disclaimer */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">WhatsApp Policy & Gateway Compliance: </span>
            OpenWA is an independent WhatsApp gateway transport layer. Ensure all campaign recipients are strictly opted-in with legitimate consent. The platform incorporates automatic rate-limiting and opt-out suppression to safeguard account integrity.
          </div>
        </div>

        {/* Connected Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((s: any) => {
            const isConnected = s.status === 'CONNECTED';
            const isQrReady = s.status === 'QR_READY';

            return (
              <div
                key={s.id}
                className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-400">
                      {s.provider}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isConnected
                            ? 'bg-emerald-400 pulse-dot'
                            : isQrReady
                            ? 'bg-sky-400'
                            : 'bg-rose-500'
                        }`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          isConnected
                            ? 'text-emerald-400'
                            : isQrReady
                            ? 'text-sky-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white truncate">{s.displayName}</h3>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    {s.phoneNumber || 'Phone not assigned yet'}
                  </div>

                  {s.qrCode && (
                    <div className="my-4 p-3 bg-white rounded-xl w-36 h-36 mx-auto flex items-center justify-center shadow-md">
                      <img src={s.qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-1.5 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Session ID:</span>
                      <span className="font-mono text-slate-300">{s.providerSessionId.slice(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Seen:</span>
                      <span>{s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleTimeString() : 'Never'}</span>
                    </div>
                  </div>
                </div>

                {/* Session Actions */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2">
                  {!isConnected ? (
                    <button
                      onClick={() => startSessionMutation.mutate(s.id)}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Start / Pair</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => stopSessionMutation.mutate(s.id)}
                      className="flex-1 py-1.5 px-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-400 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  )}

                  <button
                    onClick={() => syncStatusMutation.mutate(s.id)}
                    title="Sync Live Status"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setTestSessionId(s.id);
                      setTestModalOpen(true);
                    }}
                    title="Send Test Message"
                    className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Connect Modal */}
        {connectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setConnectModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-white mb-1">Connect WhatsApp Session</h2>
              <p className="text-xs text-slate-400 mb-5">
                Add a new line for dispatching event marketing invitations
              </p>

              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Display Label / Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="e.g. Marketing Primary Line"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    WhatsApp Gateway Provider
                  </label>
                  <select
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MOCK">Mock Simulator (Instant local development & testing)</option>
                    <option value="OPENWA">OpenWA REST Server (Live WhatsApp Gateway)</option>
                    <option value="META_CLOUD">Meta WhatsApp Cloud API</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConnectModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSessionMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-lg text-white"
                  >
                    {createSessionMutation.isPending ? 'Initializing...' : 'Initialize Line'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Test Send Modal */}
        {testModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => {
                  setTestModalOpen(false);
                  setTestResult(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-white mb-1">Send Test Message</h2>
              <p className="text-xs text-slate-400 mb-4">
                Verify session connectivity and message delivery before launching campaigns
              </p>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs mb-4 ${
                    testResult.success
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <div>✓ Test message dispatched successfully! Provider ID: {testResult.data.providerMessageId}</div>
                  ) : (
                    <div>❌ Test send failed: {testResult.error}</div>
                  )}
                </div>
              )}

              <form onSubmit={handleTestSend} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select WhatsApp Line</label>
                  <select
                    value={testSessionId || (sessions[0]?.id || '')}
                    onChange={(e) => setTestSessionId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                  >
                    {sessions.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Phone Number (E.164)</label>
                  <input
                    type="text"
                    required
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Test Message Content</label>
                  <textarea
                    rows={3}
                    required
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTestModalOpen(false);
                      setTestResult(null);
                    }}
                    className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={testSendMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white"
                  >
                    {testSendMutation.isPending ? 'Sending...' : 'Send Test'}
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

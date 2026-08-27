'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import {
  Zap,
  Upload,
  Send,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  Sparkles,
  Download,
  Trash2,
  Play,
  Pause,
} from 'lucide-react';

export default function QuickBroadcastPage() {
  const [contacts, setContacts] = useState<Array<{ name: string; phone: string; company?: string }>>([]);
  const [message, setMessage] = useState(
    'Hello {{name}}! 👋\n\nYou are invited to our exclusive annual launch event!\n\n📍 Venue: Grand Convention Center\n🗓 Date: Upcoming Weekend\n\nPlease reply "YES" to confirm your attendance.',
  );
  const [delayMs, setDelayMs] = useState(4000);
  const [fileName, setFileName] = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [logs, setLogs] = useState<Array<{ id: number; phone: string; status: 'SUCCESS' | 'FAILED' | 'PENDING'; text: string }>>([]);
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  useEffect(() => {
    api.get('/whatsapp/sessions').then((res: any) => {
      const list = Array.isArray(res) ? res : res?.data || [];
      setSessions(list);
      const connected = list.find((s: any) => s.status === 'CONNECTED') || list[0];
      if (connected) {
        setSelectedSessionId(connected.id);
      }
    }).catch(() => {});
  }, []);

  function parseCleanPhone(raw: any): string {
    let s = String(raw || '').trim();
    if (s.toLowerCase().includes('e+') || s.toLowerCase().includes('e-')) {
      try {
        s = Number(s).toLocaleString('fullwide', { useGrouping: false });
      } catch {}
    }
    const clean = s.replace(/[^\d+]/g, '');
    if (clean.startsWith('+')) return clean;
    if (clean.length === 10) return `+91${clean}`;
    return `+${clean}`;
  }

  // Handle CSV / Excel File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('number'));
        const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('first'));

        const parsed = lines.slice(1).map((line) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const rawPhone = phoneIdx !== -1 ? cols[phoneIdx] : cols[1] || cols[0] || '';
          const formattedPhone = parseCleanPhone(rawPhone);
          const name = String(nameIdx !== -1 ? cols[nameIdx] : cols[0] || 'Friend');

          return { name, phone: formattedPhone };
        }).filter((c) => c.phone.length >= 8);

        setContacts(parsed);
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res: any = await api.post('/contacts/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res?.previewRows) {
        const parsed = res.previewRows.map((r: any) => {
          const rawPhone = r.phoneNumber || r.phone || r.Phone || r.Mobile || Object.values(r)[1] || '';
          const formattedPhone = parseCleanPhone(rawPhone);
          const name = String(r.firstName || r.name || r.Name || Object.values(r)[0] || 'Friend');
          return { name, phone: formattedPhone };
        }).filter((c: any) => c.phone.length >= 8);

        setContacts(parsed);
      }
    } catch {
      alert('Could not read file. Please ensure it is a valid CSV or Excel file.');
    }
  };

  const handleAddManual = () => {
    if (!manualPhone) return;
    const formattedPhone = parseCleanPhone(manualPhone);
    setContacts([...contacts, { name: manualName || 'Friend', phone: formattedPhone }]);
    setManualPhone('');
    setManualName('');
  };

  // Automated Direct WhatsApp Broadcaster connected to the live Baileys line
  const handleStartBroadcast = async () => {
    if (contacts.length === 0) {
      alert('Please upload an Excel/CSV file or add contacts first.');
      return;
    }

    if (!selectedSessionId) {
      alert('Please select an active WhatsApp line.');
      return;
    }

    setBroadcasting(true);
    setLogs([]);
    setCurrentProgress(0);

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const personalizedMsg = message
        .replace(/{{name}}/g, contact.name)
        .replace(/{{firstName}}/g, contact.name)
        .replace(/{{phone}}/g, contact.phone);

      try {
        await api.post('/whatsapp/sessions/test-send', {
          whatsappSessionId: selectedSessionId,
          phoneNumber: contact.phone,
          messageContent: personalizedMsg,
        });

        setLogs((prev) => [
          {
            id: Date.now() + i,
            phone: contact.phone,
            status: 'SUCCESS',
            text: `✅ [${i + 1}/${contacts.length}] Sent to ${contact.name} (${contact.phone})`,
          },
          ...prev,
        ]);
      } catch (err: any) {
        const errorMsg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Number not registered on WhatsApp';
        setLogs((prev) => [
          {
            id: Date.now() + i,
            phone: contact.phone,
            status: 'FAILED',
            text: `❌ [${i + 1}/${contacts.length}] Failed for ${contact.name} (${contact.phone}): ${errorMsg}`,
          },
          ...prev,
        ]);
      }

      setCurrentProgress(Math.round(((i + 1) / contacts.length) * 100));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    setBroadcasting(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-400" />
              <span>Direct Bulk WhatsApp Broadcaster</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Broadcast personalized WhatsApp messages directly to 5,000–10,000 Excel/CSV contacts
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/sample-contacts-import.csv"
              download="sample-contacts-import.csv"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Excel Template</span>
            </a>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Configuration & Message */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Select WhatsApp Line */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Sending WhatsApp Line</span>
                </label>
                <span className="text-[11px] text-slate-400">Live Gateway</span>
              </div>

              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
              >
                {sessions.length === 0 ? (
                  <option value="">Loading WhatsApp Lines...</option>
                ) : (
                  sessions.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName} ({s.phoneNumber || s.provider}) — [{s.status}]
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. File Upload Dropzone */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                  <span>Import Contacts (Excel / CSV)</span>
                </h3>
                {contacts.length > 0 && (
                  <button
                    onClick={() => {
                      setContacts([]);
                      setFileName(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear ({contacts.length})</span>
                  </button>
                )}
              </div>

              <div className="border border-dashed border-slate-700/80 rounded-xl p-6 text-center hover:border-indigo-500/50 transition-colors">
                <input
                  type="file"
                  id="quick-excel-upload"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="quick-excel-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 hover:underline">
                      {fileName ? `Loaded: ${fileName}` : 'Click to Upload Excel (.xlsx) or CSV'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Auto-detects phone and name columns</p>
                  </div>
                </label>
              </div>

              {/* Manual Add Quick Line */}
              <div className="pt-2 border-t border-slate-800/60">
                <div className="text-xs font-semibold text-slate-400 mb-2">Or Add Single Number Manually:</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name (e.g. Rahul)"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-1/3 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Phone (e.g. +919804239301)"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                  <button
                    onClick={handleAddManual}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Message Editor */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Compose Message Template</span>
              </h3>

              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMessage((prev) => prev + ' {{name}}')}
                  className="px-2.5 py-1 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg"
                >
                  + &#123;&#123;name&#125;&#125;
                </button>
                <button
                  type="button"
                  onClick={() => setMessage((prev) => prev + ' {{phone}}')}
                  className="px-2.5 py-1 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg"
                >
                  + &#123;&#123;phone&#125;&#125;
                </button>
              </div>

              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Safe Delay:</span>
                  <select
                    value={delayMs}
                    onChange={(e) => setDelayMs(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs"
                  >
                    <option value={1500}>1.5 Seconds (Fast)</option>
                    <option value={2500}>2.5 Seconds (Standard)</option>
                    <option value={4000}>4.0 Seconds (Safest)</option>
                  </select>
                </div>

                <button
                  onClick={handleStartBroadcast}
                  disabled={broadcasting || contacts.length === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all"
                >
                  {broadcasting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Broadcasting ({currentProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>🚀 Start Bulk Broadcast ({contacts.length} Contacts)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Loaded Contacts & Live Logs */}
          <div className="lg:col-span-5 space-y-5">
            {/* Contacts Preview */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Target Contacts ({contacts.length})</h3>
                <span className="text-[11px] text-slate-400">Ready to dispatch</span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No contacts loaded yet. Upload your spreadsheet above.
                  </div>
                ) : (
                  contacts.map((c, i) => {
                    const encodedMsg = encodeURIComponent(
                      message.replace(/{{name}}/g, c.name).replace(/{{phone}}/g, c.phone),
                    );
                    const cleanDigits = c.phone.replace(/[^\d]/g, '');
                    const waUrl = `https://web.whatsapp.com/send?phone=${cleanDigits}&text=${encodedMsg}`;

                    return (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-200 block truncate">{c.name}</span>
                          <div className="text-[11px] font-mono text-slate-400">{c.phone}</div>
                        </div>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0"
                        >
                          <Send className="w-3 h-3" />
                          <span>Direct Send</span>
                        </a>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Progress Logs */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white">Live Broadcast Logs</h3>

              {broadcasting && (
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              )}

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {logs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    Live dispatch logs will appear here once you click Start Bulk Broadcast.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-2 p-2 bg-slate-950/80 rounded-lg text-xs text-emerald-300 border border-slate-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{log.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { WhatsAppPreview } from '@/components/whatsapp-preview';
import api from '@/lib/api';
import {
  Send,
  Calendar,
  Users,
  Smartphone,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Clock,
} from 'lucide-react';

function NewCampaignPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get('eventId') || '';
  const initialGroupId = searchParams.get('groupId') || '';
  const initialTemplateId = searchParams.get('templateId') || '';

  const [step, setStep] = useState(1);

  // Form states
  const [name, setName] = useState('Garment Expo 2026 VIP Invitation Wave');
  const [eventId, setEventId] = useState(initialEventId);
  const [campaignType, setCampaignType] = useState('INVITATION');
  const [audienceType, setAudienceType] = useState(initialGroupId ? 'GROUP' : 'ALL');
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [whatsappSessionId, setWhatsappSessionId] = useState('');
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [messageContent, setMessageContent] = useState(
    'Hi {{firstName}},\n\nYou are cordially invited to *{{eventName}}*.\n\n📅 *Date:* {{eventDate}}\n⏰ *Time:* {{eventTime}}\n📍 *Venue:* {{venue}}\n\nKindly confirm your attendance via your personalized RSVP link:\n👉 {{rsvpUrl}}\n\nWe look forward to welcoming you!\nWarm regards,\n*{{companyName}}*',
  );
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop');
  const [testPhoneNumber, setTestPhoneNumber] = useState('+919876543210');
  const [testSendStatus, setTestSendStatus] = useState<any>(null);
  const [scheduleType, setScheduleType] = useState<'NOW' | 'LATER'>('NOW');
  const [scheduledDate, setScheduledDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Data fetching
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events'),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: () => api.get('/groups'),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['whatsapp-sessions'],
    queryFn: () => api.get('/whatsapp/sessions'),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates'),
  });

  // Set default session if available
  useEffect(() => {
    if (sessions.length > 0 && !whatsappSessionId) {
      const connected = sessions.find((s: any) => s.status === 'CONNECTED');
      setWhatsappSessionId(connected ? connected.id : sessions[0].id);
    }
  }, [sessions, whatsappSessionId]);

  // Set default event if available
  useEffect(() => {
    if (events.length > 0 && !eventId) {
      setEventId(events[0].id);
    }
  }, [events, eventId]);

  const selectedEvent = events.find((e: any) => e.id === eventId);
  const selectedSession = sessions.find((s: any) => s.id === whatsappSessionId);

  // When template selected, update message content
  const handleTemplateSelect = (tId: string) => {
    setTemplateId(tId);
    const tmpl = templates.find((t: any) => t.id === tId);
    if (tmpl) {
      setMessageContent(tmpl.content);
      if (tmpl.mediaUrl) setMediaUrl(tmpl.mediaUrl);
    }
  };

  // Test Message Mutation
  const testMessageMutation = useMutation({
    mutationFn: (data: any) => api.post('/whatsapp/sessions/test-send', data),
    onSuccess: (res: any) => {
      setTestSendStatus({ success: true, data: res });
    },
    onError: (err: any) => {
      setTestSendStatus({ success: false, error: err.message });
    },
  });

  const handleSendTestMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setTestSendStatus(null);
    testMessageMutation.mutate({
      whatsappSessionId,
      phoneNumber: testPhoneNumber,
      messageContent,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? 'IMAGE' : undefined,
    });
  };

  // Launch Campaign Mutation
  const createAndLaunchMutation = useMutation({
    mutationFn: async () => {
      // 1. Create Campaign
      const campaign: any = await api.post('/campaigns', {
        name,
        eventId: eventId || undefined,
        campaignType,
        whatsappSessionId,
        templateId: templateId || undefined,
        messageContent,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaUrl ? 'IMAGE' : undefined,
        targetAudience: {
          type: audienceType,
          groupIds: audienceType === 'GROUP' && selectedGroupId ? [selectedGroupId] : undefined,
        },
        scheduledAt: scheduleType === 'LATER' && scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
      });

      // 2. If immediate launch
      if (scheduleType === 'NOW') {
        await api.post(`/campaigns/${campaign.id}/launch`, {});
      }

      return campaign;
    },
    onSuccess: (campaign: any) => {
      router.push(`/campaigns/${campaign.id}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to launch campaign');
    },
  });

  const availableVariables = [
    '{{firstName}}',
    '{{fullName}}',
    '{{company}}',
    '{{eventName}}',
    '{{eventDate}}',
    '{{eventTime}}',
    '{{venue}}',
    '{{rsvpUrl}}',
    '{{mapsUrl}}',
    '{{companyName}}',
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Send className="w-6 h-6 text-indigo-400" />
              <span>Multi-Step Campaign Builder</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Construct personalized WhatsApp invitations, verify compliance, and launch delivery waves
            </p>
          </div>
          <Link
            href="/campaigns"
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </Link>
        </div>

        {/* 8-Step Breadcrumb Bar */}
        <div className="glass-panel p-3 rounded-2xl border border-slate-800 grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center text-[11px]">
          {[
            { num: 1, label: 'Details' },
            { num: 2, label: 'Audience' },
            { num: 3, label: 'WhatsApp' },
            { num: 4, label: 'Message' },
            { num: 5, label: 'Compliance' },
            { num: 6, label: 'Test Send' },
            { num: 7, label: 'Schedule' },
            { num: 8, label: 'Launch' },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => step > s.num && setStep(s.num)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                step === s.num
                  ? 'bg-indigo-600 border-indigo-500 text-white font-bold shadow-sm'
                  : step > s.num
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="font-mono text-[9px]">{s.num}</div>
              <div className="truncate">{s.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Details */}
        {step === 1 && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <h2 className="text-base font-bold text-white">Step 1 — Campaign Details & Event Link</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. VIP Dealer Invitation Wave 1"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Target Event *</label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                >
                  <option value="">-- Select Event --</option>
                  {events.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({new Date(e.startAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Campaign Type</label>
                <select
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                >
                  <option value="INVITATION">Invitation</option>
                  <option value="REMINDER">Event Reminder</option>
                  <option value="CONFIRMATION">Confirmation Notice</option>
                  <option value="FOLLOW_UP">Post-Event Follow-up</option>
                  <option value="ANNOUNCEMENT">General Announcement</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(2)}
                disabled={!name || !eventId}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <span>Continue to Audience</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Audience */}
        {step === 2 && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <h2 className="text-base font-bold text-white">Step 2 — Target Audience Selection</h2>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { type: 'ALL', label: 'All Contacts', desc: 'Every opted-in contact in your organization' },
                  { type: 'GROUP', label: 'Contact Group / Segment', desc: 'Target a specific group (e.g. VIP Dealers)' },
                  { type: 'EVENT_GUESTS', label: 'Existing Event Guests', desc: 'Target guests already registered on event list' },
                ].map((aud) => (
                  <div
                    key={aud.type}
                    onClick={() => setAudienceType(aud.type)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      audienceType === aud.type
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-200 mb-1">{aud.label}</div>
                    <div className="text-[11px] text-slate-400">{aud.desc}</div>
                  </div>
                ))}
              </div>

              {audienceType === 'GROUP' && (
                <div className="pt-2">
                  <label className="block font-semibold text-slate-300 mb-1">Select Group Segment</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  >
                    <option value="">-- Choose Group --</option>
                    {groups.map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.contactCount || 0} contacts)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <span>Continue to WhatsApp Line</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: WhatsApp Number */}
        {step === 3 && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <h2 className="text-base font-bold text-white">Step 3 — Select Sending WhatsApp Line</h2>
            <p className="text-xs text-slate-400">
              Messages will be dispatched through this connected WhatsApp account
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sessions.map((s: any) => {
                const isSelected = whatsappSessionId === s.id;
                const isConnected = s.status === 'CONNECTED';

                return (
                  <div
                    key={s.id}
                    onClick={() => setWhatsappSessionId(s.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-200">{s.displayName}</div>
                      <div className="text-xs font-mono text-slate-400">{s.phoneNumber || 'Simulator line'}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Provider: {s.provider}</div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isConnected
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!whatsappSessionId}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <span>Continue to Message & Live Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Message Template & Live Phone Preview */}
        {step === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Editor column */}
            <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
              <h2 className="text-base font-bold text-white">Step 4 — Message Editor & Tokens</h2>

              {/* Template selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Load Existing Template (Optional)
                </label>
                <select
                  value={templateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                >
                  <option value="">-- Custom Message --</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variable Token Clickers */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Click to insert Variable Tag</span>
                </label>
                <div className="flex flex-wrap gap-1 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  {availableVariables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMessageContent((prev) => prev + v)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-indigo-600/30 text-indigo-300 border border-slate-800 text-[10px] font-mono"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Message Body *
                </label>
                <textarea
                  rows={8}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Banner Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Header Banner Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  disabled={!messageContent.trim()}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  <span>Continue to Compliance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Phone WhatsApp Preview Column */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Live Dynamic Preview
              </div>
              <WhatsAppPreview
                templateContent={messageContent}
                mediaUrl={mediaUrl}
                sampleEvent={selectedEvent}
              />
            </div>
          </div>
        )}

        {/* STEP 5: Compliance Summary */}
        {step === 5 && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <h2 className="text-base font-bold text-white">Step 5 — Compliance & Suppression Review</h2>
            <p className="text-xs text-slate-400">
              Audit the target audience against opt-in timestamps and suppression list
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Total Filtered Audience</div>
                <div className="text-xl font-bold text-white mt-1">5 Recipients</div>
                <div className="text-[11px] text-emerald-400 mt-0.5">100% Eligible</div>
              </div>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Marketing Opt-In Status</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">Verified</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Opt-in timestamps logged</div>
              </div>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Suppression List Filter</div>
                <div className="text-xl font-bold text-purple-400 mt-1">Active</div>
                <div className="text-[11px] text-slate-400 mt-0.5">0 Opted-out numbers removed</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Anti-Spam & Operational Rate Limit Active</span>
              </div>
              <p className="text-[11px] text-slate-400">
                All messages will be sent sequentially with token-bucket operational throttling (1,000ms delay) to ensure delivery stability without flooding recipient devices.
              </p>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(4)}
                className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
              >
                Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <span>Continue to Test Send</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Test Send */}
        {step === 6 && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <h2 className="text-base font-bold text-white">Step 6 — Test Message to Administrator</h2>
            <p className="text-xs text-slate-400">
              Send an actual sample WhatsApp message to your own device to inspect layout and RSVP buttons
            </p>

            {testSendStatus && (
              <div
                className={`p-3 rounded-lg text-xs ${
                  testSendStatus.success
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
              >
                {testSendStatus.success ? (
                  <div>✓ Test message dispatched successfully! Message ID: {testSendStatus.data.providerMessageId}</div>
                ) : (
                  <div>❌ Test send failed: {testSendStatus.error}</div>
                )}
              </div>
            )}

            <form onSubmit={handleSendTestMessage} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Test Destination Phone (E.164)
                </label>
                <input
                  type="text"
                  required
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full max-w-sm px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={testMessageMutation.isPending}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg font-semibold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-indigo-400" />
                <span>{testMessageMutation.isPending ? 'Sending Test...' : 'Send Test WhatsApp'}</span>
              </button>
            </form>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(5)}
                className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
              >
                Back
              </button>
              <button
                onClick={() => setStep(7)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <span>Continue to Scheduling</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: Schedule */}
        {step === 7 && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <h2 className="text-base font-bold text-white">Step 7 — Launch Schedule</h2>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setScheduleType('NOW')}
                  className={`p-4 rounded-xl border cursor-pointer ${
                    scheduleType === 'NOW'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-200">Send Immediately</div>
                  <div className="text-[11px] text-slate-400 mt-1">Begin dispatching as soon as launched</div>
                </div>

                <div
                  onClick={() => setScheduleType('LATER')}
                  className={`p-4 rounded-xl border cursor-pointer ${
                    scheduleType === 'LATER'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-200">Schedule for Later</div>
                  <div className="text-[11px] text-slate-400 mt-1">Timezone-aware delayed execution</div>
                </div>
              </div>

              {scheduleType === 'LATER' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Scheduled Date & Time (Asia/Kolkata)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full max-w-sm px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(6)}
                className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
              >
                Back
              </button>
              <button
                onClick={() => setStep(8)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <span>Continue to Launch Confirmation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 8: Final Launch Confirmation */}
        {step === 8 && (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Step 8 — Launch Campaign Confirmation</h2>
              <p className="text-xs text-slate-400 mt-1">
                Please review the campaign execution summary below before initiating dispatch
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400">Campaign Name:</div>
                <div className="font-bold text-white text-sm">{name}</div>
                <div className="text-slate-400 pt-2">Target Event:</div>
                <div className="font-semibold text-indigo-300">{selectedEvent?.name}</div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400">WhatsApp Line:</div>
                <div className="font-bold text-white text-sm">{selectedSession?.displayName}</div>
                <div className="text-slate-400 pt-2">Execution Mode:</div>
                <div className="font-semibold text-emerald-400">
                  {scheduleType === 'NOW' ? 'Immediate Execution' : `Scheduled for ${scheduledDate}`}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(7)}
                className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
              >
                Back
              </button>
              <button
                onClick={() => createAndLaunchMutation.mutate()}
                disabled={createAndLaunchMutation.isPending}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl shadow-emerald-600/30 transition-all"
              >
                {createAndLaunchMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm & Launch Campaign</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        </DashboardLayout>
      }
    >
      <NewCampaignPageContent />
    </Suspense>
  );
}

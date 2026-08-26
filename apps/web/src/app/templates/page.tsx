'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import { FileText, Plus, Copy, Trash2, X, Sparkles, Send } from 'lucide-react';
import Link from 'next/link';

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('INVITATION');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const availableVariables = [
    { token: '{{firstName}}', label: 'First Name' },
    { token: '{{fullName}}', label: 'Full Name' },
    { token: '{{company}}', label: 'Recipient Company' },
    { token: '{{eventName}}', label: 'Event Name' },
    { token: '{{eventDate}}', label: 'Event Date' },
    { token: '{{eventTime}}', label: 'Event Time' },
    { token: '{{venue}}', label: 'Venue' },
    { token: '{{rsvpUrl}}', label: 'Personalized RSVP Link' },
    { token: '{{mapsUrl}}', label: 'Google Maps Link' },
    { token: '{{companyName}}', label: 'Organization Name' },
  ];

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates'),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => api.post('/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => setError(err.message),
  });

  const resetForm = () => {
    setName('');
    setContent('');
    setMediaUrl('');
    setError(null);
  };

  const insertVariable = (token: string) => {
    setContent((prev) => prev + token);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createTemplateMutation.mutate({
      name,
      category,
      content,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? 'IMAGE' : undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-400" />
              <span>WhatsApp Message Templates</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Design reusable invitation and reminder templates with dynamic variable placeholders
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Template</span>
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t: any) => (
            <div
              key={t.id}
              className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {t.category}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {Array.isArray(t.variables) ? `${t.variables.length} variables` : ''}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-2">{t.name}</h3>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {t.content}
                </div>

                {t.variables && t.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {t.variables.map((v: string) => (
                      <span
                        key={v}
                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  href={`/campaigns/new?templateId=${t.id}`}
                  className="w-full py-1.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Use in Campaign</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Create Template Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-white mb-1">Create Message Template</h2>
              <p className="text-xs text-slate-400 mb-4">
                Click variable pills below to dynamically insert placeholders into your message
              </p>

              {error && (
                <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Template Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. VIP Gala Invitation"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    >
                      <option value="INVITATION">Invitation</option>
                      <option value="REMINDER">Event Reminder</option>
                      <option value="CONFIRMATION">RSVP Confirmation</option>
                      <option value="FOLLOW_UP">Post-Event Follow-up</option>
                    </select>
                  </div>
                </div>

                {/* Variable Token Clickers */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Insert Variable Tokens (Click to add)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                    {availableVariables.map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        onClick={() => insertVariable(v.token)}
                        className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-slate-800 text-[11px] font-mono transition-colors"
                      >
                        {v.token}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Message Content *</label>
                  <textarea
                    rows={6}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Hi {{firstName}}, you are invited to {{eventName}} on {{eventDate}} at {{venue}}! RSVP here: {{rsvpUrl}}"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Image URL (Optional)</label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTemplateMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white"
                  >
                    {createTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
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

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import { FolderTree, Plus, Users, Send, X, Edit, Trash2 } from 'lucide-react';

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: () => api.get('/groups'),
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: any) => api.post('/groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
      setModalOpen(false);
      setName('');
      setDescription('');
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createGroupMutation.mutate({ name, description });
  };

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
    },
    onError: (err: any) => {
      alert(`Could not delete group: ${err.message}`);
    },
  });

  const handleDeleteGroup = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete group "${name}"?`)) {
      deleteGroupMutation.mutate(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FolderTree className="w-6 h-6 text-indigo-400" />
              <span>Contact Groups & Segments</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Organize your contacts into targeted audience cohorts for personalized WhatsApp invitations
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((g: any) => (
            <div
              key={g.id}
              className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {g.contactCount || 0} Contacts
                    </span>
                    <button
                      onClick={() => handleDeleteGroup(g.id, g.name)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">{g.name}</h3>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  {g.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  href={`/contacts?groupId=${g.id}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  View Contacts →
                </Link>

                <Link
                  href={`/campaigns/new?groupId=${g.id}`}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Target</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Create Group Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-white mb-1">Create Contact Group</h2>
              <p className="text-xs text-slate-400 mb-4">
                Define an audience segment (e.g. VIP Dealers, Press, Kolkata Guests)
              </p>

              {error && (
                <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Group Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tier 1 Retail Partners"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe purpose of this group..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createGroupMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white"
                  >
                    {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
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

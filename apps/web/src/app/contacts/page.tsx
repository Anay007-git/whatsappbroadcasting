'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import {
  Users,
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FolderTree,
  Building,
  Phone,
  Mail,
  X,
  Calendar,
  Trash2,
  Tag,
  Check,
} from 'lucide-react';

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedContactDetail, setSelectedContactDetail] = useState<any>(null);

  // New Contact Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [designation, setDesignation] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts', search, selectedGroup],
    queryFn: () =>
      api.get('/contacts', {
        params: {
          search: search || undefined,
          groupId: selectedGroup || undefined,
        },
      }),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: () => api.get('/groups'),
  });

  const createContactMutation = useMutation({
    mutationFn: (data: any) => api.post('/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setSelectedContactDetail(null);
    },
    onError: (err: any) => {
      alert(`Could not delete contact: ${err.message}`);
    },
  });

  const updateContactGroupsMutation = useMutation({
    mutationFn: ({ id, groupIds }: { id: string; groupIds: string[] }) =>
      api.patch(`/contacts/${id}`, { groupIds }),
    onSuccess: (updated: any) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      if (selectedContactDetail && selectedContactDetail.id === updated.id) {
        setSelectedContactDetail(updated);
      }
    },
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setEmail('');
    setCompany('');
    setDesignation('');
    setGroupIds([]);
    setError(null);
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createContactMutation.mutate({
      firstName,
      lastName,
      phoneNumber,
      email: email || undefined,
      company: company || undefined,
      designation: designation || undefined,
      groupIds,
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      deleteContactMutation.mutate(id);
    }
  };

  const contacts = contactsData?.items || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-400" />
              <span>Contacts Directory</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage your address book, organize custom groups, and inspect opt-in telemetry
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/contacts/import"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import Excel / CSV</span>
            </Link>

            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
              <span>Filter Group:</span>
            </div>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Groups (No Filter)</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g._count?.members || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Phone Number</th>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Assigned Groups</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {contacts.map((c: any) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedContactDetail(c)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-100">{c.fullName}</div>
                      {c.email && <div className="text-[11px] text-slate-500">{c.email}</div>}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-300">
                      {c.phoneNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div>{c.company || '—'}</div>
                      {c.designation && <div className="text-[11px] text-slate-500">{c.designation}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {c.groups && c.groups.length > 0 ? (
                          c.groups.map((g: any) => (
                            <span
                              key={g.id}
                              className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-[10px] text-indigo-300 font-medium"
                            >
                              {g.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.optedOut ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3 h-3" />
                          <span>Opted Out</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Opted In</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedContactDetail(c)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.fullName)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No contacts found. Click &quot;Add Contact&quot; or &quot;Import Excel / CSV&quot; above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Contact Modal */}
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
              <button
                onClick={() => {
                  setAddModalOpen(false);
                  resetForm();
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-white mb-1">Add New Contact</h2>
              <p className="text-xs text-slate-400 mb-4">
                Enter contact profile and assign audience groups
              </p>

              {error && (
                <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateContact} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Rahul"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Sharma"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (E.164) *</label>
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+919804239301"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Company</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Company Name"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="Director"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Groups</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg max-h-32 overflow-y-auto">
                    {groups.map((g: any) => {
                      const isSelected = groupIds.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setGroupIds(groupIds.filter((id) => id !== g.id));
                            } else {
                              setGroupIds([...groupIds, g.id]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createContactMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white"
                  >
                    {createContactMutation.isPending ? 'Saving...' : 'Save Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contact Profile Detail & Group Manager Drawer */}
        {selectedContactDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full h-[90vh] p-6 shadow-2xl flex flex-col justify-between overflow-y-auto relative">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <h2 className="text-lg font-bold text-white">Contact Profile</h2>
                  <button
                    onClick={() => setSelectedContactDetail(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-lg">
                      {selectedContactDetail.firstName?.slice(0, 1) || 'C'}
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">{selectedContactDetail.fullName}</div>
                      <div className="text-xs text-slate-400">{selectedContactDetail.company || 'Private Contact'}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(selectedContactDetail.id, selectedContactDetail.fullName)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>

                <div className="mt-6 space-y-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-slate-400 text-[10px]">WhatsApp Phone</div>
                      <div className="font-mono text-slate-200 font-bold">{selectedContactDetail.phoneNumber}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="text-slate-400 text-[10px]">Email</div>
                      <div className="text-slate-200">{selectedContactDetail.email || 'None registered'}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Building className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="text-slate-400 text-[10px]">Company & Role</div>
                      <div className="text-slate-200">{selectedContactDetail.company || '—'} ({selectedContactDetail.designation || 'Staff'})</div>
                    </div>
                  </div>
                </div>

                {/* Manage Groups Assignment */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Assign Groups (Click to Toggle)</span>
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    {groups.length === 0 ? (
                      <span className="text-slate-500 text-xs">No groups created yet. Create a group first under Groups tab.</span>
                    ) : (
                      groups.map((g: any) => {
                        const currentGroupIds = selectedContactDetail.groups?.map((gr: any) => gr.id) || [];
                        const isAssigned = currentGroupIds.includes(g.id);

                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              const newGroupIds = isAssigned
                                ? currentGroupIds.filter((gid: string) => gid !== g.id)
                                : [...currentGroupIds, g.id];

                              updateContactGroupsMutation.mutate({
                                id: selectedContactDetail.id,
                                groupIds: newGroupIds,
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                              isAssigned
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {isAssigned && <Check className="w-3.5 h-3.5" />}
                            <span>{g.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => setSelectedContactDetail(null)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-300 transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

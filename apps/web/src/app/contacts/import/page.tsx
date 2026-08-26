'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import api from '@/lib/api';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Users,
  ShieldCheck,
  Download,
  Check,
} from 'lucide-react';

export default function ImportContactsPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<any>({
    fullName: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    company: '',
    designation: '',
  });
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: groups = [] } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: () => api.get('/groups'),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const res: any = await api.post('/contacts/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPreviewData(res);
      // Auto-set suggested mappings
      if (res.suggestedMapping) {
        setColumnMapping((prev: any) => ({
          ...prev,
          ...res.suggestedMapping,
        }));
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to read file.');
    } finally {
      setUploading(false);
    }
  };

  const handleProcessImport = async () => {
    if (!file) return;
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'options',
      JSON.stringify({
        columnMapping,
        defaultGroupId: selectedGroup || undefined,
        marketingOptIn: true,
        optInSource: 'EXCEL_IMPORT',
      }),
    );

    try {
      const res: any = await api.post('/contacts/import/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(res);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Import processing failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Upload className="w-6 h-6 text-indigo-400" />
              <span>Contact Import Wizard</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Upload CSV or Excel (.xlsx) files with intelligent column auto-detection and phone normalization
            </p>
          </div>
          <Link
            href="/contacts"
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Contacts</span>
          </Link>
        </div>

        {/* Wizard Step Progress */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { num: 1, title: 'Upload File' },
            { num: 2, title: 'Map Columns' },
            { num: 3, title: 'Validate & Group' },
            { num: 4, title: 'Complete' },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-2 rounded-xl border transition-colors ${
                step === s.num
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-bold'
                  : step > s.num
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <span>{s.num}. {s.title}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="glass-panel p-10 rounded-2xl border border-dashed border-slate-700 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Upload CSV or Excel Spreadsheet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Supports .csv, .xlsx, and .xls. The file should contain names, phone numbers, and optional company details.
              </p>
            </div>

            <label className="cursor-pointer px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all">
              <span>{uploading ? 'Reading File...' : 'Select File from Device'}</span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        )}

        {/* STEP 2: Map Columns */}
        {step === 2 && previewData && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Map Spreadsheet Columns to Application Fields</h2>
              <p className="text-xs text-slate-400 mt-1">
                Detected {previewData.totalRows} rows. Match each field to the corresponding column header.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Phone Number Column <span className="text-rose-400">*</span>
                </label>
                <select
                  value={columnMapping.phoneNumber || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="">-- Select Column --</option>
                  {previewData.headers.map((h: string) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name / Contact Name</label>
                <select
                  value={columnMapping.fullName || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="">-- None (Or use First/Last) --</option>
                  {previewData.headers.map((h: string) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">First Name (if separate)</label>
                <select
                  value={columnMapping.firstName || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="">-- None --</option>
                  {previewData.headers.map((h: string) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Last Name (if separate)</label>
                <select
                  value={columnMapping.lastName || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="">-- None --</option>
                  {previewData.headers.map((h: string) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Column</label>
                <select
                  value={columnMapping.email || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="">-- None --</option>
                  {previewData.headers.map((h: string) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Company / Organization Column</label>
                <select
                  value={columnMapping.company || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, company: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="">-- None --</option>
                  {previewData.headers.map((h: string) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sample preview table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden mt-4">
              <div className="bg-slate-900/60 p-3 font-semibold text-xs text-slate-300 border-b border-slate-800">
                File Preview (First 5 Rows)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] text-slate-400">
                  <thead className="bg-slate-950 border-b border-slate-800">
                    <tr>
                      {previewData.headers.map((h: string) => (
                        <th key={h} className="p-2.5 font-medium text-slate-300">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {previewData.previewRows.map((row: any, i: number) => (
                      <tr key={i}>
                        {previewData.headers.map((h: string) => (
                          <td key={h} className="p-2.5">
                            {String(row[h] || '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
              >
                Back
              </button>
              <button
                disabled={!columnMapping.phoneNumber}
                onClick={() => setStep(3)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
              >
                <span>Continue to Validation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Validate & Group Assignment */}
        {step === 3 && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Target Group & Opt-in Confirmation</h2>
              <p className="text-xs text-slate-400 mt-1">
                Assign imported contacts into a segmented group and confirm compliance status
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Assign all imported contacts to Group:
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="">-- No Group (Unassigned Contacts) --</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Compliance & Opt-in Verification</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  By executing this import, you confirm that these contacts have given legitimate consent to receive event marketing communications. Any duplicate numbers or records present in the organization suppression list will be safely filtered.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300"
              >
                Back
              </button>
              <button
                onClick={handleProcessImport}
                disabled={uploading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/25"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Execute Import ({previewData?.totalRows} Rows)</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Import Complete */}
        {step === 4 && importResult && (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Import Completed Successfully</h2>
              <p className="text-xs text-slate-400 mt-1">
                Contacts have been normalized to E.164 and stored in your directory.
              </p>
            </div>

            {/* Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Total Rows Detected</div>
                <div className="text-lg font-bold text-white">{importResult.totalRows}</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-emerald-400">Imported & Valid</div>
                <div className="text-lg font-bold text-emerald-400">{importResult.insertedCount}</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-amber-400">Duplicates Filtered</div>
                <div className="text-lg font-bold text-amber-400">{importResult.duplicatesCount}</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] text-rose-400">Invalid / Suppressed</div>
                <div className="text-lg font-bold text-rose-400">
                  {importResult.invalidCount + importResult.suppressedCount}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <Link
                href="/contacts"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                View Contacts Directory
              </Link>
              <Link
                href="/campaigns/new"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
              >
                Create Invitation Campaign
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

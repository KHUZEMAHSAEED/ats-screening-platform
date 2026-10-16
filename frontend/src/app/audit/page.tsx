'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AuditLogItem } from '@/lib/types';
import { AuditTimeline } from '@/components/AuditTimeline';
import { ShieldCheck, RefreshCw, Download, Filter } from 'lucide-react';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAuditLogs({
        action: actionFilter || undefined,
        page: 1,
      });
      setLogs(res.items);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Governance & Tamper-Evident Audit Trail
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <ShieldCheck className="h-3 w-3" />
              SOC2 / Compliance
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Immutable chronological log of resume uploads, criteria changes, recruiter decisions, and score calculations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getExportCsvUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export Log CSV
          </a>
          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-xs text-slate-900 focus:border-indigo-600"
        >
          <option value="">All Logged Actions</option>
          <option value="HR_DECISION">HR Hiring Decisions (Shortlist / Reject / Hold)</option>
          <option value="RESUME_UPLOADED">Resume Uploads</option>
          <option value="RESUME_PARSED">Resume Parsing & Scoring</option>
          <option value="JOB_CREATED">Job Openings Created</option>
          <option value="CANDIDATE_NOTE">Candidate Notes</option>
          <option value="EXPORT">Data Exports</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">
          {logs.length} audit records found
        </span>
      </div>

      {/* Audit Timeline */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <AuditTimeline logs={logs} emptyMessage="No audit records match the current filter." />
      )}
    </div>
  );
}

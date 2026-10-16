'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CandidateListItem, Job } from '@/lib/types';
import { CandidateTable } from '@/components/CandidateTable';
import { Search, Download, Filter, RefreshCw, Eye, EyeOff, Shield, Scale, X } from 'lucide-react';

export default function CandidatesDirectoryPage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState('');
  const [selectedDecision, setSelectedDecision] = useState('');
  const [search, setSearch] = useState('');
  const [blindMode, setBlindMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const pageSize = 15;

  const handleToggleSelect = (appId: string) => {
    if (selectedIds.includes(appId)) {
      setSelectedIds(selectedIds.filter((id) => id !== appId));
    } else {
      if (selectedIds.length >= 4) {
        alert('You can select a maximum of 4 candidates for head-to-head comparison.');
        return;
      }
      setSelectedIds([...selectedIds, appId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === candidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.slice(0, 4).map((c) => c.application_id));
    }
  };

  const fetchCandidates = async () => {
    try {
      setIsLoading(true);
      const res = await api.getCandidates({
        job_id: selectedJob || undefined,
        recommendation_status: selectedRecommendation || undefined,
        hr_decision: selectedDecision || undefined,
        search: search || undefined,
        blind_mode: blindMode,
        page,
        page_size: pageSize,
      });
      setCandidates(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    api.getJobs().then((data) => setJobs(data.items)).catch(console.error);
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [selectedJob, selectedRecommendation, selectedDecision, blindMode, page]);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Candidate Screening Directory
          </h1>
          <p className="text-xs text-slate-500">
            Search, filter, and review all applicants screened across active job openings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setBlindMode(!blindMode)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors border ${
              blindMode
                ? 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Redact candidate names, emails, and contact details to mitigate unconscious demographic bias"
          >
            {blindMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-slate-400" />}
            {blindMode ? 'Blind Review Active' : 'Enable Blind Review'}
          </button>
          <a
            href={api.getExportCsvUrl(selectedJob)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <button
            onClick={fetchCandidates}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Blind Screening Advisory Banner */}
      {blindMode && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 shadow-sm">
          <Shield className="h-4 w-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Blind Screening Active (EEOC & OFCCP De-Biasing Mode): </span>
            Candidate personal identifying information (full name, email, phone) has been masked with anonymized tokens to enforce pure merit-based evaluation during first-round screening.
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCandidates()}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        {/* Job opening */}
        <select
          value={selectedJob}
          onChange={(e) => {
            setSelectedJob(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600"
        >
          <option value="">All Job Openings</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} ({j.applications_count})
            </option>
          ))}
        </select>

        {/* Advisory Recommendation */}
        <select
          value={selectedRecommendation}
          onChange={(e) => {
            setSelectedRecommendation(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600"
        >
          <option value="">All Advisory Statuses</option>
          <option value="RECOMMENDED_FOR_SHORTLISTING">Recommended for Shortlisting</option>
          <option value="NEEDS_HR_REVIEW">Needs HR Review</option>
          <option value="DOES_NOT_MEET_CRITERIA">Below Criteria</option>
          <option value="PROCESSING_FAILED">Parsing Failed</option>
        </select>

        {/* HR Decision */}
        <select
          value={selectedDecision}
          onChange={(e) => {
            setSelectedDecision(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600"
        >
          <option value="">All Final HR Decisions</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="SHORTLISTED">Shortlisted by HR</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="REJECTED">Rejected by HR</option>
        </select>
      </div>

      {/* Candidate Table */}
      <CandidateTable
        candidates={candidates}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
      />

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 rounded-xl shadow-sm text-xs">
          <div className="text-slate-500">
            Showing <span className="font-semibold text-slate-900">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-900">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            of <span className="font-semibold text-slate-900">{total}</span> applicants
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium text-slate-600">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= total}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Floating Side-by-Side Comparison Dock */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900/95 px-5 py-3 text-xs text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 font-bold text-white text-[11px]">
              {selectedIds.length}
            </span>
            <span className="font-semibold">
              {selectedIds.length === 1 ? '1 candidate selected' : `${selectedIds.length} candidates selected`}
            </span>
            <span className="text-slate-400">(2 to 4 required)</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            {selectedIds.length >= 2 ? (
              <Link
                href={`/candidates/compare?ids=${selectedIds.join(',')}${blindMode ? '&blind_mode=true' : ''}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/25 transition-colors"
              >
                <Scale className="h-4 w-4" />
                Compare Head-to-Head ({selectedIds.length})
              </Link>
            ) : (
              <span className="rounded-xl bg-slate-800 px-4 py-2 font-semibold text-slate-500 cursor-not-allowed">
                Select 1 more to compare
              </span>
            )}

            <button
              onClick={() => setSelectedIds([])}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

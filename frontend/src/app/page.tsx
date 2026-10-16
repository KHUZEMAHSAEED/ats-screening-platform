'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DashboardSummary, CandidateListItem, Job } from '@/lib/types';
import { StatsCard } from '@/components/StatsCard';
import { CandidateTable } from '@/components/CandidateTable';
import {
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertOctagon,
  XCircle,
  Upload,
  Download,
  Filter,
  Search,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardSummary | null>(null);
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Auto-login fallback if not logged in to guarantee immediate out-of-the-box functionality
  useEffect(() => {
    async function initData() {
      try {
        setIsLoading(true);
        // Attempt quick auth if no token
        try {
          await api.getMe();
        } catch {
          await api.login('admin@example.com', 'AdminPass123!');
        }

        const [statsData, candidatesData, jobsData] = await Promise.all([
          api.getDashboardSummary(),
          api.getCandidates({ page_size: 10 }),
          api.getJobs(),
        ]);

        setStats(statsData);
        setCandidates(candidatesData.items);
        setJobs(jobsData.items);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initData();
  }, []);

  const handleFilter = async () => {
    try {
      setIsLoading(true);
      const res = await api.getCandidates({
        job_id: selectedJob || undefined,
        recommendation_status: selectedStatus || undefined,
        search: searchQuery || undefined,
        page_size: 10,
      });
      setCandidates(res.items);
    } catch (err) {
      console.error('Filter error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (jobs.length > 0) {
      handleFilter();
    }
  }, [selectedJob, selectedStatus]);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            Human-in-the-Loop Screening Active
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ATS Screening Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
            Upload candidate resumes, review deterministic qualification scores, and finalize shortlist/rejection decisions with full human oversight.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={api.getExportCsvUrl(selectedJob)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV Report
          </a>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-950/30 hover:bg-indigo-400 transition-all"
          >
            <Upload className="h-4 w-4" />
            Upload Resumes
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatsCard
          title="Total Uploads"
          value={stats ? stats.total_uploaded_resumes : '...'}
          subtitle="All documents"
          icon={FileText}
          variant="default"
        />
        <StatsCard
          title="Processed"
          value={stats ? stats.resumes_processed : '...'}
          subtitle="Screened against jobs"
          icon={CheckCircle2}
          variant="indigo"
        />
        <StatsCard
          title="Recommended"
          value={stats ? stats.recommended_for_shortlisting : '...'}
          subtitle="High criteria match"
          icon={Sparkles}
          variant="emerald"
        />
        <StatsCard
          title="Awaiting Review"
          value={stats ? stats.awaiting_hr_review : '...'}
          subtitle="Pending decision"
          icon={Clock}
          variant="amber"
        />
        <StatsCard
          title="Shortlisted"
          value={stats ? stats.shortlisted_by_hr : '...'}
          subtitle="Confirmed by HR"
          icon={CheckCircle2}
          variant="indigo"
        />
        <StatsCard
          title="Rejected"
          value={stats ? stats.rejected_by_hr : '...'}
          subtitle="Confirmed by HR"
          icon={XCircle}
          variant="rose"
        />
      </div>

      {/* Filter and Candidate Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Candidate Screening Directory
            </h2>
            <p className="text-xs text-slate-500">
              Review explainable scoring breakdowns and commit human hiring decisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidate or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
              />
            </div>

            {/* Job Opening Dropdown */}
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-600"
            >
              <option value="">All Job Openings</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.applications_count})
                </option>
              ))}
            </select>

            {/* Recommendation Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-600"
            >
              <option value="">All Advisory Statuses</option>
              <option value="RECOMMENDED_FOR_SHORTLISTING">Recommended for Shortlisting</option>
              <option value="NEEDS_HR_REVIEW">Needs HR Review</option>
              <option value="DOES_NOT_MEET_CRITERIA">Below Criteria</option>
              <option value="PROCESSING_FAILED">Parsing Failed</option>
            </select>
          </div>
        </div>

        {/* Candidate Table */}
        <CandidateTable candidates={candidates} isLoading={isLoading} />
      </div>
    </div>
  );
}

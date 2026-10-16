'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Job, ScreeningCriteria, RediscoveryResponse } from '@/lib/types';
import { CriteriaBuilder } from '@/components/CriteriaBuilder';
import {
  Briefcase,
  Plus,
  Users,
  Archive,
  RefreshCw,
  CheckCircle2,
  X,
  Sliders,
  Calendar,
  Sparkles,
  ExternalLink,
  UserCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

function JobsManagementContent() {
  const searchParams = useSearchParams();
  const shouldOpenCreate = searchParams?.get('create') === 'true';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(shouldOpenCreate);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Talent Rediscovery State
  const [rediscoveryJob, setRediscoveryJob] = useState<Job | null>(null);
  const [rediscoveryData, setRediscoveryData] = useState<RediscoveryResponse | null>(null);
  const [isLoadingRediscovery, setIsLoadingRediscovery] = useState(false);
  const [minRediscoveryScore, setMinRediscoveryScore] = useState(30);

  // Form State
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [location, setLocation] = useState('Remote');
  const [workArrangement, setWorkArrangement] = useState('Hybrid');
  const [criteria, setCriteria] = useState<ScreeningCriteria | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reEvaluatingJobId, setReEvaluatingJobId] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const data = await api.getJobs(true);
      setJobs(data.items);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openRediscovery = async (job: Job, minScore = minRediscoveryScore) => {
    try {
      setRediscoveryJob(job);
      setIsLoadingRediscovery(true);
      const res = await api.getTalentRediscovery(job.id, minScore);
      setRediscoveryData(res);
    } catch (err) {
      console.error('Failed to load rediscovery candidates:', err);
    } finally {
      setIsLoadingRediscovery(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const openCreateModal = () => {
    setEditingJob(null);
    setTitle('');
    setDepartment('Engineering');
    setDescription('');
    setResponsibilities('');
    setLocation('Remote');
    setWorkArrangement('Hybrid');
    setCriteria(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setTitle(job.title);
    setDepartment(job.department);
    setDescription(job.description);
    setResponsibilities(job.responsibilities || '');
    setLocation(job.location || 'Remote');
    setWorkArrangement(job.work_arrangement || 'Hybrid');
    setCriteria(job.criteria || null);
    setIsModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please fill in Job Title and Description.');
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        title,
        department,
        description,
        responsibilities,
        location,
        work_arrangement: workArrangement,
        criteria: criteria || undefined,
      };

      if (editingJob) {
        await api.updateJob(editingJob.id, payload);
      } else {
        await api.createJob(payload);
      }

      setIsModalOpen(false);
      await fetchJobs();
    } catch (err: any) {
      alert('Error saving job opening: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleArchive = async (jobId: string) => {
    try {
      await api.toggleArchiveJob(jobId);
      await fetchJobs();
    } catch (err: any) {
      alert('Error updating archive status: ' + err.message);
    }
  };

  const handleReEvaluate = async (jobId: string) => {
    try {
      setReEvaluatingJobId(jobId);
      const res = await api.reEvaluateJob(jobId);
      alert(res.message);
      await fetchJobs();
    } catch (err: any) {
      alert('Failed to re-evaluate: ' + err.message);
    } finally {
      setReEvaluatingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Job Openings & Screening Criteria
          </h1>
          <p className="text-xs text-slate-500">
            Manage hiring requirements, mandatory competencies, and scoring weights.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create New Job Opening
        </button>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                job.is_archived ? 'border-slate-200 opacity-60' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                      {job.department}
                    </span>
                    {job.is_archived && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                        Archived
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">{job.title}</h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>{job.location} · {job.work_arrangement}</span>
                    <span>· Created {formatDate(job.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  {job.applications_count} Applicants
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {job.description}
              </p>

              {/* Criteria Summary Chips */}
              {job.criteria && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Mandatory Competencies ({job.criteria.mandatory_skills.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.criteria.mandatory_skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                      >
                        {s.name} ({s.min_years}y+)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openEditModal(job)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    Edit Criteria
                  </button>
                  <button
                    onClick={() => openRediscovery(job)}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 font-semibold text-purple-700 hover:bg-purple-100 shadow-sm transition-colors"
                    title="Cross-match historical candidate pool from other openings"
                  >
                    <Sparkles className="h-3 w-3 text-purple-600" />
                    Rediscover Talent
                  </button>
                  <button
                    onClick={() => handleReEvaluate(job.id)}
                    disabled={reEvaluatingJobId === job.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${reEvaluatingJobId === job.id ? 'animate-spin' : ''}`} />
                    Re-evaluate
                  </button>
                </div>

                <button
                  onClick={() => handleToggleArchive(job.id)}
                  className="text-slate-400 hover:text-slate-600 font-medium"
                >
                  {job.is_archived ? 'Reactivate' : 'Archive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl my-8 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingJob ? 'Edit Job Opening & Criteria' : 'Create Job Opening'}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure job description, screening criteria, and scoring weights.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="mt-5 space-y-6">
              {/* Job Basic Info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Python Backend Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Work Arrangement
                  </label>
                  <select
                    value={workArrangement}
                    onChange={(e) => setWorkArrangement(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-600"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Job Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Summary of responsibilities and scope of role..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Criteria Builder */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Screening Criteria & Weights Configuration
                </h3>
                <CriteriaBuilder
                  initialCriteria={criteria || undefined}
                  onChange={(newCrit) => setCriteria(newCrit)}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingJob ? 'Update Job Opening' : 'Publish Job Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Talent Pool Rediscovery Modal */}
      {rediscoveryJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl my-8 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Talent Pool Rediscovery
                  </h2>
                  <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                    {rediscoveryJob.title}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Cross-matches applicants who applied to other job openings against this role&apos;s mandatory and preferred criteria.
                </p>
              </div>
              <button
                onClick={() => setRediscoveryJob(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Threshold Filter Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">Min Transferable Match Score:</span>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={minRediscoveryScore}
                  onChange={(e) => {
                    const score = Number(e.target.value);
                    setMinRediscoveryScore(score);
                    openRediscovery(rediscoveryJob, score);
                  }}
                  className="w-32 accent-purple-600"
                />
                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {minRediscoveryScore}%+
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-500 font-medium">
                <span>Evaluated: <strong className="text-slate-900">{rediscoveryData?.total_pool_evaluated || 0}</strong> candidates</span>
                <span>·</span>
                <span>Matches: <strong className="text-purple-700">{rediscoveryData?.matches_found || 0}</strong> candidates</span>
              </div>
            </div>

            {/* Rediscovery Results List */}
            <div className="mt-4 max-h-[500px] overflow-y-auto space-y-3 pr-1">
              {isLoadingRediscovery ? (
                <div className="flex min-h-[220px] items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                    <span className="text-xs text-slate-500 font-medium">Scanning candidate pool across jobs...</span>
                  </div>
                </div>
              ) : rediscoveryData?.candidates && rediscoveryData.candidates.length > 0 ? (
                rediscoveryData.candidates.map((cand, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-purple-300 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 text-sm">{cand.candidate_name}</span>
                        <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {cand.anonymized_id}
                        </span>
                        <span className="text-xs text-slate-400">
                          Originally applied for: <strong className="text-slate-700">{cand.original_job_title}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                          cand.match_score >= 70
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {cand.match_score}% Match
                        </span>
                        <Link
                          href={`/candidates`}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View In Directory
                        </Link>
                      </div>
                    </div>

                    {/* Matched & Missing Skills Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-emerald-700">Matched Skills:</span>
                        {cand.matched_mandatory.length > 0 ? (
                          cand.matched_mandatory.map((m, i) => (
                            <span key={i} className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                              ✓ {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400">None</span>
                        )}
                      </div>

                      {cand.missing_mandatory.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 ml-2">
                          <span className="text-[11px] font-bold text-rose-600">Missing Gaps:</span>
                          {cand.missing_mandatory.map((m, i) => (
                            <span key={i} className="rounded-md bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                              ✗ {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">No cross-job matches found at this threshold.</p>
                  <p>Try lowering the minimum match score slider above to scan for adjacent candidate profiles.</p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setRediscoveryJob(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobsManagementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading job management...</div>}>
      <JobsManagementContent />
    </Suspense>
  );
}

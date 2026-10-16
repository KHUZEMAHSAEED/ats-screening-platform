'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Job, ScreeningCriteria } from '@/lib/types';
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
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

function JobsManagementContent() {
  const searchParams = useSearchParams();
  const shouldOpenCreate = searchParams?.get('create') === 'true';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(shouldOpenCreate);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(job)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    Edit Criteria
                  </button>
                  <button
                    onClick={() => handleReEvaluate(job.id)}
                    disabled={reEvaluatingJobId === job.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${reEvaluatingJobId === job.id ? 'animate-spin' : ''}`} />
                    Re-evaluate Candidates
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

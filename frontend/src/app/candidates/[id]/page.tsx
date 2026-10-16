'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { CandidateDetail } from '@/lib/types';
import { formatDate, getRecommendationBadge, getDecisionBadge, getScoreColor } from '@/lib/utils';
import { ResumeViewer } from '@/components/ResumeViewer';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { DecisionModal } from '@/components/DecisionModal';
import { AuditTimeline } from '@/components/AuditTimeline';
import {
  ArrowLeft,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Briefcase,
  Calendar,
  GraduationCap,
  Award,
  MessageSquare,
  History,
  ShieldCheck,
  Send,
} from 'lucide-react';

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params?.id as string;

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'screening' | 'profile' | 'notes' | 'audit'>('screening');
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCandidateDetail(applicationId);
      setCandidate(data);
    } catch (err) {
      console.error('Error loading candidate detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      loadData();
    }
  }, [applicationId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      setIsSubmittingNote(true);
      await api.addNote(applicationId, newNoteText.trim());
      setNewNoteText('');
      await loadData();
    } catch (err: any) {
      alert('Failed to add note: ' + err.message);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm text-slate-500 font-medium">Loading candidate dossier...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h3 className="text-base font-bold text-slate-900">Candidate Not Found</h3>
        <p className="mt-1 text-xs text-slate-500">
          The requested application could not be located.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const recBadge = getRecommendationBadge(candidate.recommendation_status);
  const decBadge = getDecisionBadge(candidate.hr_decision);
  const scoreColors = getScoreColor(candidate.match_result?.overall_score || null);

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-indigo-600">
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/candidates" className="hover:text-indigo-600">Candidates</Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">{candidate.anonymized_id}</span>
      </div>

      {/* Candidate Profile Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {candidate.candidate_name}
            </h1>
            <span className="rounded-md bg-indigo-50 px-2.5 py-1 font-mono text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
              {candidate.anonymized_id}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${recBadge.color}`}
              title={recBadge.desc}
            >
              Advisory: {recBadge.label}
            </span>
            <span
              className={`inline-flex items-center rounded-md border px-3 py-0.5 text-xs font-bold shadow-sm ${decBadge.color}`}
            >
              Decision: {decBadge.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Briefcase className="h-4 w-4 text-slate-400" />
              {candidate.job_title} ({candidate.job_department})
            </div>
            {candidate.email && (
              <div>· Email: <span className="text-slate-700 font-medium">{candidate.email}</span></div>
            )}
            {candidate.phone && (
              <div>· Phone: <span className="text-slate-700 font-medium">{candidate.phone}</span></div>
            )}
            <div>· Applied: {formatDate(candidate.applied_at)}</div>
          </div>
        </div>

        {/* Human-in-the-Loop Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsDecisionModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
            Commit HR Decision
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('screening')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === 'screening'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Screening & Resume
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Extracted Profile Facts
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === 'notes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          HR Notes ({candidate.notes?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit History
        </button>
      </div>

      {/* TAB 1: Screening & Resume Dual-Pane */}
      {activeTab === 'screening' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Pane: Resume Document Preview (7 cols) */}
          <div className="lg:col-span-7">
            <ResumeViewer
              resumeId={candidate.resume.id}
              originalFilename={candidate.resume.original_filename}
              fileSize={candidate.resume.file_size}
              mimeType={candidate.resume.mime_type}
              extractedText={candidate.parsed_data?.extracted_text}
              parsingMethod={candidate.parsed_data?.parsing_method}
              onRetry={loadData}
            />
          </div>

          {/* Right Pane: Match Breakdown & Rules (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {candidate.match_result ? (
              <ScoreBreakdown
                matchResult={candidate.match_result}
                candidateExperience={candidate.parsed_data?.total_experience_years || 0}
                minExperienceRequired={3.0}
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                Match result is being processed or unavailable.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Structured Extracted Facts */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {candidate.parsed_data ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Skills */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Extracted Technical Competencies & Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.parsed_data.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education & Certifications */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Education & Certifications
                </h3>
                <div className="space-y-3">
                  {candidate.parsed_data.education.map((edu, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <GraduationCap className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-slate-900">{edu.degree}</div>
                        {edu.institution && (
                          <div className="text-xs text-slate-500">{edu.institution}</div>
                        )}
                        {edu.graduation_year && (
                          <div className="text-[11px] text-slate-400">Class of {edu.graduation_year}</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {candidate.parsed_data.certifications.map((cert, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5 text-xs font-medium text-emerald-900">
                      <Award className="h-4 w-4 text-emerald-600" />
                      {cert}
                    </div>
                  ))}
                </div>
              </div>

              {/* Employment History & Calculated Tenure */}
              <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Employment Timeline (Calculated Total: {candidate.parsed_data.total_experience_years} Years)
                  </h3>
                </div>

                <div className="space-y-3">
                  {candidate.parsed_data.experience_items.map((exp, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          {exp.start_year} – {exp.end_year}
                        </span>
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                          ~{exp.duration_years} yrs tenure
                        </span>
                      </div>
                      {exp.snippet && (
                        <p className="font-mono text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-100">
                          &quot;{exp.snippet}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              No structured profile data extracted.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HR Recruiter Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-6 max-w-3xl">
          {/* Note Input */}
          <form onSubmit={handleAddNote} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Add Recruiter Interview / Screening Note
            </label>
            <textarea
              rows={3}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Record notes on candidate communication, technical phone screen, interview feedback..."
              className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingNote || !newNoteText.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {isSubmittingNote ? 'Saving...' : 'Post Note'}
              </button>
            </div>
          </form>

          {/* Notes List */}
          <div className="space-y-3">
            {candidate.notes && candidate.notes.length > 0 ? (
              candidate.notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{note.author_name || 'HR Recruiter'}</span>
                    <span className="text-[11px] text-slate-400">{formatDate(note.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
                No recruiter notes added yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="max-w-3xl">
          <AuditTimeline
            logs={candidate.decisions.map((d) => ({
              id: d.id,
              action: `HR_DECISION_${d.decision}`,
              entity_type: 'job_application',
              entity_id: candidate.application_id,
              user_email: d.reviewer_name || 'HR Recruiter',
              details: { reason: d.reason, is_override: d.is_override },
              created_at: d.created_at,
            }))}
            emptyMessage="No decisions recorded for this candidate yet."
          />
        </div>
      )}

      {/* Human-in-the-Loop Decision Modal */}
      <DecisionModal
        applicationId={candidate.application_id}
        candidateName={candidate.candidate_name}
        anonymizedId={candidate.anonymized_id}
        currentRecommendation={candidate.recommendation_status}
        currentDecision={candidate.hr_decision}
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}

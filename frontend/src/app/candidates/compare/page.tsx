'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { CandidateComparisonResponse, CandidateComparisonItem } from '@/lib/types';
import { getScoreColor, getRecommendationBadge, getDecisionBadge } from '@/lib/utils';
import { DecisionModal } from '@/components/DecisionModal';
import {
  ArrowLeft,
  Scale,
  CheckCircle2,
  XCircle,
  Briefcase,
  GraduationCap,
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Printer,
  AlertCircle,
  Award
} from 'lucide-react';

function CandidateCompareContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams?.get('ids') || '';
  const initialBlind = searchParams?.get('blind_mode') === 'true';

  const [comparison, setComparison] = useState<CandidateComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blindMode, setBlindMode] = useState(initialBlind);
  const [decisionCandidate, setDecisionCandidate] = useState<CandidateComparisonItem | null>(null);

  const applicationIds = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const fetchComparison = async () => {
    if (applicationIds.length < 2) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await api.compareCandidates(applicationIds, blindMode);
      setComparison(data);
    } catch (err) {
      console.error('Failed to load candidate comparison:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [idsParam, blindMode]);

  if (applicationIds.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center max-w-lg mx-auto space-y-4 my-12">
        <Scale className="h-10 w-10 text-indigo-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Insufficient Candidates Selected</h2>
        <p className="text-xs text-slate-500">
          Please select at least 2 candidates (and up to 4) from the candidate directory to perform a side-by-side comparison.
        </p>
        <Link
          href="/candidates"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Candidate Directory
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500 font-medium">
            Generating side-by-side competency matrix...
          </p>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center max-w-lg mx-auto my-12 space-y-3">
        <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Comparison Failed</h3>
        <p className="text-xs text-slate-500">
          Could not retrieve comparison matrix for the selected candidates.
        </p>
        <Link
          href="/candidates"
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white"
        >
          Return to Candidates
        </Link>
      </div>
    );
  }

  const colsCount = comparison.candidates.length;
  const gridColsClass =
    colsCount === 2
      ? 'grid-cols-2'
      : colsCount === 3
      ? 'grid-cols-3'
      : 'grid-cols-4';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/candidates" className="inline-flex items-center gap-1 hover:text-indigo-600">
              <ArrowLeft className="h-3.5 w-3.5" />
              Candidate Directory
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Head-to-Head Comparison</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Candidate Calibration Matrix
            </h1>
            <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700">
              {comparison.job_title} ({comparison.job_department})
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 print:hidden">
          <button
            onClick={() => setBlindMode(!blindMode)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors ${
              blindMode
                ? 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Redact candidate identities to eliminate demographic and prestige bias"
          >
            {blindMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-slate-400" />}
            {blindMode ? 'Blind Mode Active' : 'Enable Blind Review'}
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print / Export PDF
          </button>
        </div>
      </div>

      {/* Executive Calibration Verdict Summary */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600 shrink-0" />
          <h2 className="text-sm font-bold text-slate-900">
            Automated Hiring Calibration Synthesis
          </h2>
        </div>
        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed pl-7">
          {comparison.executive_summary}
        </p>
      </div>

      {/* Side-by-Side Candidate Overview Cards */}
      <div className={`grid grid-cols-1 md:${gridColsClass} gap-5`}>
        {comparison.candidates.map((cand) => {
          const scoreColors = getScoreColor(cand.overall_score);
          const recBadge = getRecommendationBadge(cand.recommendation_status);
          const decBadge = getDecisionBadge(cand.hr_decision);

          return (
            <div
              key={cand.application_id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 transition-all hover:border-indigo-300 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header Info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {cand.candidate_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {cand.anonymized_id}
                      </span>
                      {cand.email && (
                        <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {cand.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Overall Score Badge */}
                  <div
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 min-w-[62px] text-center border ${scoreColors.bg} ${scoreColors.ring}`}
                  >
                    <span className={`text-lg font-extrabold ${scoreColors.text}`}>
                      {cand.overall_score.toFixed(0)}%
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      Match
                    </span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${recBadge.color}`}
                  >
                    {recBadge.label}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-bold shadow-sm ${decBadge.color}`}
                  >
                    {decBadge.label}
                  </span>
                </div>

                {/* Quantitative Score Dimensions */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Category Breakdown
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <div className="flex justify-between text-[11px] font-medium mb-0.5">
                        <span className="text-slate-600">Mandatory Skills</span>
                        <span className="font-bold text-slate-900">
                          {cand.mandatory_score.toFixed(0)}% ({cand.matched_mandatory_count}/{cand.total_mandatory_count})
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${cand.mandatory_score}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-medium mb-0.5">
                        <span className="text-slate-600">Preferred Skills</span>
                        <span className="font-bold text-slate-900">{cand.preferred_score.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{ width: `${cand.preferred_score}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-medium mb-0.5">
                        <span className="text-slate-600">Experience Tenure</span>
                        <span className="font-bold text-slate-900">
                          {cand.total_experience_years.toFixed(1)} yrs ({cand.experience_score.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${cand.experience_score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Education Fact */}
                {cand.education_degree && (
                  <div className="flex items-start gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                    <GraduationCap className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">{cand.education_degree}</span>
                      {cand.education_institution && (
                        <div className="text-[11px] text-slate-400">{cand.education_institution}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={`/candidates/${cand.application_id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3 w-3" />
                  Full Dossier
                </Link>

                <button
                  onClick={() => setDecisionCandidate(cand)}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Decide
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Granular Side-by-Side Competency Match Matrix */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/75 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Granular Competency Comparison Matrix
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {comparison.criteria_matrix.length} screening benchmarks evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th scope="col" className="px-6 py-3 w-1/3">
                  Screening Criterion
                </th>
                {comparison.candidates.map((c) => (
                  <th key={c.application_id} scope="col" className="px-4 py-3 text-center">
                    <span className="font-bold text-slate-900">{c.candidate_name}</span>
                    <div className="font-mono text-[10px] text-slate-400 font-normal">
                      {c.anonymized_id}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparison.criteria_matrix.map((crit, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  {/* Criterion Label */}
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-slate-900">{crit.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          crit.category.includes('Mandatory')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : crit.category.includes('Preferred')
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {crit.category}
                      </span>
                      {crit.min_years && (
                        <span className="text-[11px] text-slate-400">
                          Min {crit.min_years}y required
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Candidate Match Columns */}
                  {comparison.candidates.map((cand) => {
                    const isMatched = crit.candidate_matches[cand.application_id];
                    const evidence = crit.candidate_evidence[cand.application_id];

                    return (
                      <td
                        key={cand.application_id}
                        className={`px-4 py-3.5 text-center border-l border-slate-100 ${
                          isMatched ? 'bg-emerald-50/20' : 'bg-rose-50/20'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          {isMatched ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-rose-100 text-rose-600">
                              <XCircle className="h-4 w-4" />
                            </span>
                          )}

                          {evidence && (
                            <span
                              className="text-[10px] text-slate-500 max-w-[180px] line-clamp-2 leading-tight"
                              title={evidence}
                            >
                              &quot;{evidence}&quot;
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Human-in-the-Loop Decision Modal if triggered */}
      {decisionCandidate && (
        <DecisionModal
          applicationId={decisionCandidate.application_id}
          candidateName={decisionCandidate.candidate_name}
          anonymizedId={decisionCandidate.anonymized_id}
          currentRecommendation={decisionCandidate.recommendation_status}
          currentDecision={decisionCandidate.hr_decision}
          isOpen={!!decisionCandidate}
          onClose={() => setDecisionCandidate(null)}
          onSuccess={async () => {
            setDecisionCandidate(null);
            await fetchComparison();
          }}
        />
      )}
    </div>
  );
}

export default function CandidateComparePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-500">
          Loading comparison matrix...
        </div>
      }
    >
      <CandidateCompareContent />
    </Suspense>
  );
}

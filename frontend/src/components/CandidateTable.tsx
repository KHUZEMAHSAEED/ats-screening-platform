import React from 'react';
import Link from 'next/link';
import { CandidateListItem } from '@/lib/types';
import { formatDate, getScoreColor, getRecommendationBadge, getDecisionBadge } from '@/lib/utils';
import { ArrowUpRight, CheckCircle2, AlertCircle, Clock, ShieldAlert } from 'lucide-react';

interface CandidateTableProps {
  candidates: CandidateListItem[];
  isLoading?: boolean;
}

export const CandidateTable: React.FC<CandidateTableProps> = ({ candidates, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm text-slate-500 font-medium">Loading candidate applications...</p>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Clock className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">No candidates found</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          No candidates match the specified filter criteria. Try broadening your search or upload new resumes.
        </p>
        <Link
          href="/upload"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Upload Resumes
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-6 py-3.5">Candidate</th>
              <th scope="col" className="px-6 py-3.5">Job Opening</th>
              <th scope="col" className="px-6 py-3.5">Match Score</th>
              <th scope="col" className="px-6 py-3.5">Mandatory Criteria</th>
              <th scope="col" className="px-6 py-3.5">Automated Recommendation</th>
              <th scope="col" className="px-6 py-3.5">Final HR Decision</th>
              <th scope="col" className="px-6 py-3.5">Applied Date</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.map((cand) => {
              const scoreColor = getScoreColor(cand.overall_score);
              const recBadge = getRecommendationBadge(cand.recommendation_status);
              const decBadge = getDecisionBadge(cand.hr_decision);

              return (
                <tr key={cand.application_id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Candidate Name & Identifier */}
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">
                      {cand.candidate_name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs text-indigo-600 font-medium">
                        {cand.anonymized_id}
                      </span>
                      {cand.email && (
                        <span className="text-xs text-slate-400">· {cand.email}</span>
                      )}
                    </div>
                  </td>

                  {/* Job Applied */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{cand.job_title}</div>
                    <div className="text-xs text-slate-400">{cand.job_department}</div>
                  </td>

                  {/* Match Score */}
                  <td className="px-6 py-4">
                    {cand.overall_score !== null ? (
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${scoreColor.bg} ${scoreColor.text} ${scoreColor.ring}`}
                        >
                          {cand.overall_score.toFixed(1)}%
                        </span>
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full ${cand.overall_score >= 70 ? 'bg-emerald-500' : cand.overall_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, Math.max(5, cand.overall_score))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Processing...</span>
                    )}
                  </td>

                  {/* Mandatory Skills */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {cand.total_mandatory_count > 0 ? (
                        cand.matched_mandatory_count === cand.total_mandatory_count ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            {cand.matched_mandatory_count}/{cand.total_mandatory_count} Matched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                            {cand.matched_mandatory_count}/{cand.total_mandatory_count} Matched
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">None specified</span>
                      )}
                    </div>
                    {cand.missing_mandatory && cand.missing_mandatory.length > 0 && (
                      <div className="text-xs text-rose-500 mt-1 truncate max-w-[140px]" title={cand.missing_mandatory.join(', ')}>
                        Missing: {cand.missing_mandatory.join(', ')}
                      </div>
                    )}
                  </td>

                  {/* Automated Advisory Recommendation */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${recBadge.color}`}
                      title={recBadge.desc}
                    >
                      {recBadge.label}
                    </span>
                  </td>

                  {/* Final HR Decision */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold shadow-sm ${decBadge.color}`}
                    >
                      {decBadge.label}
                    </span>
                  </td>

                  {/* Applied Date */}
                  <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(cand.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/candidates/${cand.application_id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                    >
                      Review
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

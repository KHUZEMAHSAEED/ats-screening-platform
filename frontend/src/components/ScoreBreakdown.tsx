import React from 'react';
import { MatchResult } from '@/lib/types';
import { getScoreColor } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Layers,
  Award,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface ScoreBreakdownProps {
  matchResult: MatchResult;
  candidateExperience: number;
  minExperienceRequired: number;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  matchResult,
  candidateExperience,
  minExperienceRequired,
}) => {
  const { overall_score, score_breakdown, matched_mandatory, missing_mandatory, matched_preferred, missing_preferred, uncertain_criteria, explanation } = matchResult;
  const scoreColors = getScoreColor(overall_score);

  return (
    <div className="space-y-5">
      {/* Top Overall Score Card */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Deterministic Match Score</h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Heuristic Rules
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Weighted assessment of technical competencies, experience duration, and qualifications.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`text-3xl font-extrabold ${scoreColors.text}`}>
              {overall_score.toFixed(1)}%
            </div>
            <div className="text-xs font-semibold text-slate-400">Target: 70.0%+</div>
          </div>
        </div>
      </div>

      {/* Component Breakdown Bars */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Mandatory */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Mandatory</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {score_breakdown.mandatory_score.toFixed(0)}%
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-indigo-600"
              style={{ width: `${score_breakdown.mandatory_score}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {matched_mandatory.length}/{matched_mandatory.length + missing_mandatory.length} items
          </div>
        </div>

        {/* Preferred */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Preferred</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {score_breakdown.preferred_score.toFixed(0)}%
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-amber-500"
              style={{ width: `${score_breakdown.preferred_score}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {matched_preferred.length}/{matched_preferred.length + missing_preferred.length} bonus
          </div>
        </div>

        {/* Experience */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Experience</span>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {score_breakdown.experience_score.toFixed(0)}%
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${score_breakdown.experience_score}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {candidateExperience}y / {minExperienceRequired}y req
          </div>
        </div>

        {/* Qualifications */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Qualifications</span>
            <Award className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {score_breakdown.qualification_score.toFixed(0)}%
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${score_breakdown.qualification_score}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Degree verified</div>
        </div>
      </div>

      {/* Uncertainties & Warnings */}
      {uncertain_criteria && uncertain_criteria.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Uncertain Criteria Requiring Recruiter Clarification
          </div>
          <div className="mt-2.5 space-y-2">
            {uncertain_criteria.map((u, i) => (
              <div key={i} className="rounded-lg bg-white/80 p-2.5 text-xs border border-amber-200/60">
                <span className="font-bold text-amber-950">{u.name}: </span>
                <span className="text-amber-900">{u.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Mandatory Skills List */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Mandatory Requirements Assessment
        </h4>

        {matched_mandatory.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Verified Requirements ({matched_mandatory.length})
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {matched_mandatory.map((m, idx) => (
                <div key={idx} className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 text-xs">
                  <div className="font-bold text-emerald-950">{m.name}</div>
                  {m.evidence_snippet && (
                    <div className="mt-1 font-mono text-[11px] text-emerald-800 line-clamp-2">
                      &quot;{m.evidence_snippet}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {missing_mandatory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-600" />
              Missing or Unverified Mandatory Requirements ({missing_mandatory.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {missing_mandatory.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                >
                  <XCircle className="h-3 w-3" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preferred Skills */}
      {(matched_preferred.length > 0 || missing_preferred.length > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Preferred & Bonus Skills
          </h4>
          <div className="flex flex-wrap gap-2">
            {matched_preferred.map((m, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
              >
                <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                {m.name} (+bonus)
              </span>
            ))}
            {missing_preferred.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Human-Readable Scoring Explanation */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
          <Info className="h-4 w-4 text-slate-500" />
          Scoring Methodology & Reasoning
        </div>
        <div className="whitespace-pre-wrap font-mono text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200">
          {explanation}
        </div>
      </div>
    </div>
  );
};

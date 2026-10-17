'use client';

import React, { useState } from 'react';
import { JobCalibrationAnalysisResponse } from '@/lib/types';
import {
  X,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  Scale,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: JobCalibrationAnalysisResponse | null;
  isLoading: boolean;
  onApply: (reevaluate: boolean) => Promise<void>;
}

export function CalibrationModal({
  isOpen,
  onClose,
  data,
  isLoading,
  onApply,
}: CalibrationModalProps) {
  const [reevaluate, setReevaluate] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [showReviewers, setShowReviewers] = useState(true);

  if (!isOpen) return null;

  const handleApply = async () => {
    try {
      setIsApplying(true);
      await onApply(reevaluate);
      onClose();
    } catch (err: any) {
      alert('Failed to apply calibrated weights: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Active Learning Weight Calibration Advisor
                </h3>
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                  ML Feedback Loop
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {data ? `Requisition: ${data.job_title}` : 'Optimizing screening criteria weights...'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading || !data ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-xs font-semibold text-slate-500">
                Analyzing historical recruiter overrides and calculating feature discriminative weights...
              </p>
            </div>
          ) : (
            <>
              {/* Telemetry Summary & Gain Projection Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Human-Machine Alignment
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {data.alignment_rate}%
                    </span>
                    <span className="text-xs text-slate-500">({data.total_decisions} decisions)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, data.alignment_rate)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Recruiter Override Frequency
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-amber-600">
                      {data.override_rate}%
                    </span>
                    <span className="text-xs text-slate-500">manual deviations</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min(100, data.override_rate)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-purple-50/60 p-4 shadow-sm space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    Projected Alignment Gain
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-indigo-700">
                      +{data.estimated_alignment_gain}%
                    </span>
                    <span className="text-xs text-indigo-600 font-medium">with calibrated weights</span>
                  </div>
                  <p className="text-[10px] text-indigo-600">
                    Empirically minimizes recruiter friction & overrides
                  </p>
                </div>
              </div>

              {/* Executive Rationale Banner */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-start gap-3">
                <Scale className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Statistical Calibration Rationale
                  </h4>
                  <p className="text-xs text-indigo-900 leading-relaxed">
                    {data.executive_rationale}
                  </p>
                </div>
              </div>

              {/* Side-by-Side Weight Delta Comparison Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Screening Criteria Weight Adjustments
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Sum of calibrated weights = 100.0%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.weight_deltas.map((item, idx) => {
                    const isIncrease = item.direction === 'increase';
                    const isDecrease = item.direction === 'decrease';
                    const badgeClass = isIncrease
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isDecrease
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200';

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm hover:border-indigo-200 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {item.label}
                          </span>
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${badgeClass}`}>
                            {item.delta > 0 ? `+${item.delta}%` : `${item.delta}%`}
                          </span>
                        </div>

                        {/* Visual weight shift slider */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Current: <strong className="text-slate-800">{item.current_weight}%</strong></span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span>Recommended: <strong className="text-indigo-600 font-bold">{item.recommended_weight}%</strong></span>
                          </div>

                          <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            {/* Current mark */}
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-slate-300 rounded-full"
                              style={{ width: `${item.current_weight}%` }}
                            />
                            {/* Recommended mark */}
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-80"
                              style={{ width: `${item.recommended_weight}%` }}
                            />
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed italic">
                          {item.rationale}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviewer Calibration & Strictness Matrix */}
              {data.reviewer_metrics && data.reviewer_metrics.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Reviewer Scoring & Calibration Matrix ({data.reviewer_metrics.length})
                      </h4>
                    </div>
                    <button
                      onClick={() => setShowReviewers(!showReviewers)}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      {showReviewers ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>

                  {showReviewers && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <th className="py-2.5 px-3">Reviewer</th>
                            <th className="py-2.5 px-3">Reviews</th>
                            <th className="py-2.5 px-3">Shortlisted</th>
                            <th className="py-2.5 px-3">Rejected</th>
                            <th className="py-2.5 px-3">Override %</th>
                            <th className="py-2.5 px-3">Avg Accepted Score</th>
                            <th className="py-2.5 px-3">Strictness Rating</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.reviewer_metrics.map((r, i) => {
                            const isStrict = r.strictness_index.includes('Strict');
                            const isLenient = r.strictness_index.includes('Permissive');
                            const badge = isStrict
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLenient
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                            return (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-slate-900">{r.user_name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{r.user_email}</div>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-700">{r.total_reviews}</td>
                                <td className="py-2.5 px-3 text-emerald-600 font-bold">{r.shortlist_count}</td>
                                <td className="py-2.5 px-3 text-rose-600 font-bold">{r.reject_count}</td>
                                <td className="py-2.5 px-3 font-mono">{r.override_rate}%</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                                  {r.avg_accepted_score > 0 ? `${r.avg_accepted_score}%` : 'N/A'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge}`}>
                                    {r.strictness_index}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Re-evaluation Option Checkbox */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reevaluate}
                    onChange={(e) => setReevaluate(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Re-evaluate all existing candidates with new calibrated weights
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Re-computes deterministic match scores and updates recommendation advisory status.
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50/70">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={isLoading || isApplying || !data}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isApplying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {isApplying ? 'Applying & Re-evaluating...' : 'Adopt Calibrated Weights'}
          </button>
        </div>
      </div>
    </div>
  );
}

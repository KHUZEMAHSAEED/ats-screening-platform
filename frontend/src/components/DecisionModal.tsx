'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { CheckCircle2, PauseCircle, XCircle, AlertTriangle, X } from 'lucide-react';

interface DecisionModalProps {
  applicationId: string;
  candidateName: string;
  anonymizedId: string;
  currentRecommendation: string;
  currentDecision: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  applicationId,
  candidateName,
  anonymizedId,
  currentRecommendation,
  currentDecision,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [decision, setDecision] = useState<'SHORTLISTED' | 'ON_HOLD' | 'REJECTED'>('SHORTLISTED');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isRejecting = decision === 'REJECTED';
  const isReasonRequired = isRejecting || (decision === 'SHORTLISTED' && currentRecommendation === 'DOES_NOT_MEET_CRITERIA');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!confirmed) {
      setErrorMessage('You must explicitly check the confirmation box before finalizing this decision.');
      return;
    }

    if (isReasonRequired && (!reason || reason.trim().length < 5)) {
      setErrorMessage('Please provide a substantive justification (at least 5 characters) for this decision.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.commitDecision(applicationId, decision, reason, confirmed);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to commit decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Commit HR Screening Decision
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <span className="font-semibold text-slate-700">{candidateName}</span> ({anonymizedId})
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* HITL Notice Banner */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-900">
          <AlertTriangle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Human-in-the-Loop Governance:</span> Automated recommendations are strictly advisory. Final decisions can only be committed by an authenticated recruiter and are logged to the tamper-evident audit trail.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Decision Selection Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select Final Decision
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDecision('SHORTLISTED')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                  decision === 'SHORTLISTED'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 ring-2 ring-indigo-600 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                <span className="text-xs">Shortlist</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('ON_HOLD')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                  decision === 'ON_HOLD'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-800 ring-2 ring-amber-500 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PauseCircle className="h-5 w-5 text-amber-600" />
                <span className="text-xs">Put On Hold</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                  decision === 'REJECTED'
                    ? 'border-rose-600 bg-rose-50/80 text-rose-800 ring-2 ring-rose-600 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="h-5 w-5 text-rose-600" />
                <span className="text-xs">Reject</span>
              </button>
            </div>
          </div>

          {/* Decision Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Reviewer Notes / Reason {isReasonRequired && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isRejecting
                  ? 'Mandatory: Specify why the candidate is being rejected (e.g. lacks required 3+ years experience with distributed systems)...'
                  : 'Optional: Notes on why candidate was shortlisted or placed on hold...'
              }
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          {/* Explicit Confirmation Checkbox */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 leading-normal">
                I explicitly confirm that I have inspected this candidate&apos;s credentials and resume evidence. I am recording an authorized, auditable HR decision.
              </span>
            </label>
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !confirmed}
              className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors ${
                isRejecting
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : decision === 'ON_HOLD'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? 'Recording Decision...' : `Confirm & Commit (${decision})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

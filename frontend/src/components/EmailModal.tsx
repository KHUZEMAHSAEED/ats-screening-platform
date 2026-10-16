import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { SendEmailRequest } from '@/lib/types';
import {
  X,
  Mail,
  Send,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  candidateName: string;
  candidateEmail?: string;
  onSuccess?: () => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  candidateName,
  candidateEmail,
  onSuccess,
}) => {
  const [templateType, setTemplateType] = useState<
    'INTERVIEW_INVITATION' | 'COMPETENCY_CLARIFICATION' | 'RESPECTFUL_REJECTION' | 'OFFER_OR_NEXT_STEPS' | 'CUSTOM'
  >('INTERVIEW_INVITATION');

  const [recipientName, setRecipientName] = useState(candidateName);
  const [recipientEmail, setRecipientEmail] = useState(candidateEmail || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchPreview = async (type = templateType) => {
    try {
      setIsLoadingPreview(true);
      const prev = await api.previewCandidateEmail({
        application_id: applicationId,
        template_type: type,
      });
      setSubject(prev.subject);
      setBody(prev.body);
      setRecipientName(prev.recipient_name);
      setRecipientEmail(prev.recipient_email);
    } catch (err) {
      console.error('Failed to load email preview:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (isOpen && applicationId) {
      setConfirmed(false);
      fetchPreview(templateType);
    }
  }, [isOpen, applicationId, templateType]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      alert('Please confirm that you have reviewed the email before dispatching.');
      return;
    }
    if (!recipientEmail || !subject.trim() || !body.trim()) {
      alert('Please complete the recipient email, subject, and message body.');
      return;
    }

    try {
      setIsSending(true);
      await api.sendCandidateEmail({
        application_id: applicationId,
        template_type: templateType,
        recipient_email: recipientEmail.trim(),
        recipient_name: recipientName.trim(),
        subject: subject.trim(),
        body: body.trim(),
        confirmed_by_recruiter: true,
      });

      alert(`Communication successfully dispatched to ${recipientEmail}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert('Failed to send email: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl my-8 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Candidate Communication Hub
              </h2>
              <p className="text-xs text-slate-500">
                Draft and dispatch tailored communication to {candidateName} with recruiter review.
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

        <form onSubmit={handleSend} className="mt-4 space-y-4 text-xs">
          {/* Template Selector */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
              Select Pre-Formatted Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'INTERVIEW_INVITATION', label: 'Interview Invitation', icon: CheckCircle2 },
                { id: 'COMPETENCY_CLARIFICATION', label: 'Requirement Clarification', icon: Sparkles },
                { id: 'RESPECTFUL_REJECTION', label: 'Respectful Rejection', icon: AlertCircle },
                { id: 'OFFER_OR_NEXT_STEPS', label: 'Assessment / Next Steps', icon: Clock },
                { id: 'CUSTOM', label: 'Custom Message', icon: Mail },
              ].map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = templateType === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplateType(tpl.id as any)}
                    className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-left font-semibold transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{tpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                Recipient Email *
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                Subject Line *
              </label>
              {isLoadingPreview && (
                <span className="flex items-center gap-1 text-[11px] text-indigo-600">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Generating template...
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Invitation to Interview..."
              className="w-full rounded-lg border border-slate-300 p-2.5 font-medium text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
              Message Body (Editable) *
            </label>
            <textarea
              rows={8}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 font-sans text-xs text-slate-800 leading-relaxed focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          {/* Human-in-the-Loop Confirmation Safeguard */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-600"
              />
              <span className="font-semibold text-amber-900">
                Human-in-the-Loop Approval: I confirm that I have reviewed this tailored communication and approve sending it to {recipientEmail}.
              </span>
            </label>
            <p className="text-[11px] text-amber-800 pl-6.5">
              Mandatory Governance Policy: The ATS prohibits automated rejections or invitations without explicit recruiter authorization.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              Logged to immutable audit history upon dispatch.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending || !confirmed}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isSending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {isSending ? 'Dispatching...' : 'Approve & Send Email'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

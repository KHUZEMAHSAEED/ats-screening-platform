import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return dateStr;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getScoreColor(score: number | null): {
  bg: string;
  text: string;
  border: string;
  ring: string;
} {
  if (score === null || score === undefined) {
    return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', ring: 'ring-slate-300' };
  }
  if (score >= 70) {
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-500' };
  }
  if (score >= 50) {
    return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ring: 'ring-amber-500' };
  }
  return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', ring: 'ring-rose-500' };
}

export function getRecommendationBadge(rec: string): { label: string; color: string; desc: string } {
  switch (rec) {
    case 'RECOMMENDED_FOR_SHORTLISTING':
      return {
        label: 'Recommended',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        desc: 'Meets 100% of mandatory requirements with high qualification score.',
      };
    case 'NEEDS_HR_REVIEW':
      return {
        label: 'Needs HR Review',
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        desc: 'Qualifies with partial match or uncertainties requiring human recruiter verification.',
      };
    case 'DOES_NOT_MEET_CRITERIA':
      return {
        label: 'Below Criteria',
        color: 'bg-rose-100 text-rose-800 border-rose-300',
        desc: 'One or more mandatory requirements missing. Awaiting human decision.',
      };
    case 'PROCESSING_FAILED':
      return {
        label: 'Parsing Incomplete',
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        desc: 'Unreadable or scanned document flagged for manual review.',
      };
    default:
      return {
        label: rec || 'Pending',
        color: 'bg-slate-100 text-slate-800 border-slate-300',
        desc: 'Awaiting processing or review.',
      };
  }
}

export function getDecisionBadge(dec: string): { label: string; color: string } {
  switch (dec) {
    case 'SHORTLISTED':
      return { label: 'Shortlisted by HR', color: 'bg-blue-600 text-white border-blue-700' };
    case 'ON_HOLD':
      return { label: 'On Hold', color: 'bg-amber-500 text-white border-amber-600' };
    case 'REJECTED':
      return { label: 'Rejected by HR', color: 'bg-rose-600 text-white border-rose-700' };
    default:
      return { label: 'Pending HR Review', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
}

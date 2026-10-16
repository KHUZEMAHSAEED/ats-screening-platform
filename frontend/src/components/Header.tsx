'use client';

import React from 'react';
import Link from 'next/link';
import { Upload, Plus, ShieldCheck, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  onQuickUpload?: () => void;
  userRole?: string;
}

export const Header: React.FC<HeaderProps> = ({ userRole = 'HR Operations Lead' }) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-100">
          ATS
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              TalentFilter AI
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <ShieldCheck className="h-3 w-3" />
              HITL Enforced
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Explainable Resume Screening & Candidate Governance
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/jobs?create=true"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <Plus className="h-4 w-4 text-slate-500" />
          New Job Opening
        </Link>

        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Resumes
        </Link>

        <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="hidden sm:block text-left text-xs">
            <div className="font-semibold text-slate-900">admin@example.com</div>
            <div className="text-slate-500">{userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

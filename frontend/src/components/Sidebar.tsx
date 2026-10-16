'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UploadCloud,
  FileCheck2,
  FileText,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Candidates', href: '/candidates', icon: Users },
    { label: 'Job Openings', href: '/jobs', icon: Briefcase },
    { label: 'Resume Uploads', href: '/upload', icon: UploadCloud },
    { label: 'Audit Trail', href: '/audit', icon: FileCheck2 },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            HR Screening Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-indigo-600' : 'text-slate-400')} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-700">Deterministic Engine</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Zero automated rejections. All candidates remain available for authorized HR inspection.
          </p>
          <a
            href="http://127.0.0.1:8000/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <span>OpenAPI Spec & Docs</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </aside>
  );
};

import React from 'react';
import { AuditLogItem } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { History, Shield, CheckCircle, AlertCircle, FileText, User } from 'lucide-react';

interface AuditTimelineProps {
  logs: AuditLogItem[];
  emptyMessage?: string;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  logs,
  emptyMessage = 'No audit records logged yet.',
}) => {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
        <History className="mx-auto h-8 w-8 text-slate-400 mb-2" />
        {emptyMessage}
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    if (action.includes('SHORTLIST')) {
      return { icon: CheckCircle, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    }
    if (action.includes('REJECT')) {
      return { icon: AlertCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' };
    }
    if (action.includes('HOLD')) {
      return { icon: Shield, color: 'text-amber-600 bg-amber-50 border-amber-200' };
    }
    return { icon: FileText, color: 'text-slate-600 bg-slate-50 border-slate-200' };
  };

  return (
    <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-6">
      {logs.map((log) => {
        const { icon: Icon, color } = getActionBadge(log.action);

        return (
          <div key={log.id} className="relative group">
            {/* Timeline node */}
            <div
              className={`absolute -left-[35px] top-0 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm ${color}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-900">
                  {log.action}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatDate(log.created_at)}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>{log.user_email || 'SYSTEM'}</span>
                {log.ip_address && (
                  <span className="text-slate-400 font-mono text-[10px]">({log.ip_address})</span>
                )}
              </div>

              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 text-[11px] font-mono text-slate-700 border border-slate-100 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

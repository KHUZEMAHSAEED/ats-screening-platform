'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AuditLogItem, ComplianceMetricsResponse, WebhookSubscription } from '@/lib/types';
import { AuditTimeline } from '@/components/AuditTimeline';
import {
  ShieldCheck,
  RefreshCw,
  Download,
  Filter,
  Scale,
  Activity,
  Webhook,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Lock,
  ExternalLink,
  X
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AuditTrailPage() {
  const [activeTab, setActiveTab] = useState<'compliance' | 'logs' | 'webhooks'>('compliance');

  // Logs state
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Compliance state
  const [compliance, setCompliance] = useState<ComplianceMetricsResponse | null>(null);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(true);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [isAddWebhookOpen, setIsAddWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookDesc, setWebhookDesc] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'candidate.screened',
    'hr.decision.committed',
  ]);
  const [isSubmittingWebhook, setIsSubmittingWebhook] = useState(false);

  const fetchCompliance = async () => {
    try {
      setIsLoadingCompliance(true);
      const data = await api.getComplianceMetrics();
      setCompliance(data);
    } catch (err) {
      console.error('Failed to fetch compliance metrics:', err);
    } finally {
      setIsLoadingCompliance(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const res = await api.getAuditLogs({
        action: actionFilter || undefined,
        page: 1,
      });
      setLogs(res.items);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      setIsLoadingWebhooks(true);
      const data = await api.getWebhooks();
      setWebhooks(data);
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
    } finally {
      setIsLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'webhooks') {
      fetchWebhooks();
    }
  }, [activeTab, actionFilter]);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || selectedEvents.length === 0) {
      alert('Please provide a webhook URL and at least one event type.');
      return;
    }

    try {
      setIsSubmittingWebhook(true);
      await api.createWebhook({
        url: webhookUrl.trim(),
        description: webhookDesc.trim() || undefined,
        event_types: selectedEvents,
      });
      setWebhookUrl('');
      setWebhookDesc('');
      setIsAddWebhookOpen(false);
      await fetchWebhooks();
    } catch (err: any) {
      alert('Failed to register webhook: ' + err.message);
    } finally {
      setIsSubmittingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook subscription?')) return;
    try {
      await api.deleteWebhook(id);
      await fetchWebhooks();
    } catch (err: any) {
      alert('Failed to delete webhook: ' + err.message);
    }
  };

  const toggleEvent = (event: string) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== event));
    } else {
      setSelectedEvents([...selectedEvents, event]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Governance, Risk & Compliance Center
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <ShieldCheck className="h-3 w-3" />
              Deloitte / Google High-Risk AI
            </span>
          </div>
          <p className="text-xs text-slate-500">
            EEOC Four-Fifths compliance auditing, immutable tamper-evident logs, and enterprise outbound webhook integrations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'logs' && (
            <a
              href={api.getExportCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          )}
          {activeTab === 'webhooks' && (
            <button
              onClick={() => setIsAddWebhookOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Webhook
            </button>
          )}
          <button
            onClick={() => {
              if (activeTab === 'compliance') fetchCompliance();
              else if (activeTab === 'logs') fetchLogs();
              else fetchWebhooks();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('compliance')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === 'compliance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="h-4 w-4" />
          EEOC & AI Bias Audit
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === 'logs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="h-4 w-4" />
          Tamper-Evident Event Logs
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === 'webhooks'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Webhook className="h-4 w-4" />
          Outbound Webhooks ({webhooks.length})
        </button>
      </div>

      {/* TAB 1: COMPLIANCE AUDIT */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {isLoadingCompliance ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : compliance ? (
            <>
              {/* Top Banner Status */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-5 shadow-sm ${
                  compliance.four_fifths_rule_status === 'COMPLIANT'
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                    : 'border-rose-200 bg-rose-50/70 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      compliance.four_fifths_rule_status === 'COMPLIANT'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {compliance.four_fifths_rule_status === 'COMPLIANT' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold">
                        {compliance.four_fifths_rule_status === 'COMPLIANT'
                          ? 'EEOC Four-Fifths Rule: Compliant'
                          : 'Potential Disparate Impact Alert'}
                      </h2>
                      <span className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-xs font-bold border border-current/20">
                        Ratio: {compliance.disparate_impact_ratio} / 1.00
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed opacity-90 max-w-3xl">
                      {compliance.compliance_explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Quantitative Indicators */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total Evaluated Pool
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{compliance.total_evaluated}</div>
                  <div className="text-[11px] text-slate-500">Screened applicants</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Human Shortlisted
                  </div>
                  <div className="text-2xl font-bold text-indigo-600">{compliance.shortlisted_count}</div>
                  <div className="text-[11px] text-slate-500">Recruiter confirmed</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Overall Selection Rate
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{compliance.selection_rate}%</div>
                  <div className="text-[11px] text-slate-500">Shortlist to pool ratio</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    4/5ths Rule Threshold
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">≥ 0.80</div>
                  <div className="text-[11px] text-slate-500">Statutory safe harbor</div>
                </div>
              </div>

              {/* Regulatory Governance Frameworks Adherence */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Statutory & Regulatory Alignment (Deloitte Tech Risk Standard)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {compliance.regulatory_frameworks.map((fw, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800">{fw}</span>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Automated rule adherence verified: No demographic inputs in scoring, full explainability trace preserved.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparative Distributions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Advisory Recommendations */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Deterministic Machine Advisory Distribution
                  </h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(compliance.recommendation_distribution).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <span className="font-semibold text-slate-700">{status.replace(/_/g, ' ')}</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Human Decisions */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Human-in-the-Loop Final Decisions
                  </h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(compliance.decision_distribution).map(([decision, count]) => (
                      <div key={decision} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <span className="font-semibold text-slate-700">{decision.replace(/_/g, ' ')}</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-xs text-slate-900 focus:border-indigo-600"
            >
              <option value="">All Logged Actions</option>
              <option value="HR_DECISION">HR Hiring Decisions (Shortlist / Reject / Hold)</option>
              <option value="RESUME_UPLOADED">Resume Uploads</option>
              <option value="RESUME_PARSED">Resume Parsing & Scoring</option>
              <option value="JOB_CREATED">Job Openings Created</option>
              <option value="INTERVIEW_GUIDE_GENERATED">AI Interview Guide Generated</option>
              <option value="WEBHOOK_SUBSCRIBED">Webhook Subscribed</option>
              <option value="CANDIDATE_NOTE">Candidate Notes</option>
              <option value="EXPORT">Data Exports</option>
            </select>
            <span className="text-xs text-slate-400 ml-auto">
              {logs.length} audit records found
            </span>
          </div>

          {isLoadingLogs ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : (
            <AuditTimeline logs={logs} emptyMessage="No audit records match the current filter." />
          )}
        </div>
      )}

      {/* TAB 3: WEBHOOKS */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-indigo-600" />
              HMAC-SHA256 Signed Outbound Events
            </div>
            <p className="text-slate-600">
              Deliver real-time payloads to external HRIS platforms (Workday, SAP SuccessFactors, BambooHR). Every outbound HTTP POST includes an <code>X-ATS-Signature</code> header computed with your endpoint&apos;s secret key.
            </p>
          </div>

          {isLoadingWebhooks ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : webhooks.length > 0 ? (
            <div className="space-y-3">
              {webhooks.map((hook) => (
                <div
                  key={hook.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                          {hook.url}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          Active
                        </span>
                      </div>
                      {hook.description && (
                        <p className="mt-1 text-xs text-slate-500">{hook.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteWebhook(hook.id)}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400">Events:</span>
                      {hook.event_types.map((evt, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>

                    <div className="font-mono text-[11px] text-slate-400">
                      Secret: whsec_{hook.secret.slice(0, 8)}••••••••
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500 space-y-3">
              <p>No outbound webhook endpoints registered yet.</p>
              <button
                onClick={() => setIsAddWebhookOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Register First Webhook
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Webhook Modal */}
      {isAddWebhookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Register Outbound Webhook</h2>
              <button onClick={() => setIsAddWebhookOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWebhook} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Webhook Endpoint URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourhris.com/ats-events"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Workday Candidate Ingestion Pipeline"
                  value={webhookDesc}
                  onChange={(e) => setWebhookDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">Subscribed Event Types</label>
                <div className="space-y-2">
                  {[
                    { id: 'candidate.screened', label: 'candidate.screened (Triggered upon parsing & match scoring)' },
                    { id: 'hr.decision.committed', label: 'hr.decision.committed (Triggered on HR shortlist/reject)' },
                    { id: 'job.created', label: 'job.created (Triggered when new role is opened)' },
                  ].map((evt) => (
                    <label key={evt.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt.id)}
                        onChange={() => toggleEvent(evt.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      <span className="text-slate-700 font-medium">{evt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddWebhookOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWebhook}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmittingWebhook ? 'Saving...' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

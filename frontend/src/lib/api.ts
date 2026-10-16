import {
  User,
  Job,
  CandidateListItem,
  CandidateDetail,
  DashboardSummary,
  AuditLogItem,
  ScreeningCriteria,
  ComplianceMetricsResponse,
  InterviewGuideResponse,
  RediscoveryResponse,
  WebhookSubscription,
  WebhookCreate,
  CandidateComparisonResponse,
  EmailPreviewRequest,
  EmailPreviewResponse,
  SendEmailRequest,
  CommunicationLogResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

class ApiClient {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ats_token');
    }
    return null;
  }

  public setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ats_token', token);
    }
  }

  public clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ats_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login') && window.location.pathname !== '/') {
        // Trigger login redirect if unauthenticated
      }
    }

    if (!res.ok) {
      let errorMsg = `API Error ${res.status}: ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
  }

  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const data = await this.request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Dashboard Stats
  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/stats/summary');
  }

  // Jobs
  async getJobs(includeArchived = false): Promise<{ total: number; items: Job[] }> {
    return this.request<{ total: number; items: Job[] }>(`/jobs?include_archived=${includeArchived}`);
  }

  async getJob(id: string): Promise<Job> {
    return this.request<Job>(`/jobs/${id}`);
  }

  async createJob(jobData: Partial<Job>): Promise<Job> {
    return this.request<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  async updateJob(id: string, jobData: Partial<Job>): Promise<Job> {
    return this.request<Job>(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
  }

  async toggleArchiveJob(id: string): Promise<Job> {
    return this.request<Job>(`/jobs/${id}/archive`, {
      method: 'POST',
    });
  }

  // Candidates
  async getCandidates(params: {
    job_id?: string;
    recommendation_status?: string;
    hr_decision?: string;
    min_score?: number;
    search?: string;
    page?: number;
    page_size?: number;
    blind_mode?: boolean;
  }): Promise<{ total: number; page: number; page_size: number; items: CandidateListItem[] }> {
    const query = new URLSearchParams();
    if (params.job_id) query.set('job_id', params.job_id);
    if (params.recommendation_status) query.set('recommendation_status', params.recommendation_status);
    if (params.hr_decision) query.set('hr_decision', params.hr_decision);
    if (params.min_score !== undefined) query.set('min_score', params.min_score.toString());
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', params.page.toString());
    if (params.page_size) query.set('page_size', params.page_size.toString());
    if (params.blind_mode !== undefined) query.set('blind_mode', params.blind_mode.toString());

    return this.request<{ total: number; page: number; page_size: number; items: CandidateListItem[] }>(
      `/candidates?${query.toString()}`
    );
  }

  async getCandidateDetail(applicationId: string, blindMode = false): Promise<CandidateDetail> {
    return this.request<CandidateDetail>(`/candidates/${applicationId}?blind_mode=${blindMode}`);
  }

  // Upload
  async uploadResumes(jobId: string, files: File[]): Promise<any> {
    const formData = new FormData();
    formData.append('job_id', jobId);
    files.forEach((file) => {
      formData.append('files', file);
    });

    return this.request('/resumes/upload', {
      method: 'POST',
      body: formData,
    });
  }

  getResumeFileUrl(resumeId: string): string {
    return `${API_BASE}/resumes/${resumeId}/file`;
  }

  async retryResume(resumeId: string): Promise<{ message: string }> {
    return this.request(`/resumes/${resumeId}/retry`, {
      method: 'POST',
    });
  }

  // HR Decisions (Human-in-the-Loop)
  async commitDecision(
    applicationId: string,
    decision: 'SHORTLISTED' | 'ON_HOLD' | 'REJECTED',
    reason: string,
    confirmed: boolean
  ): Promise<any> {
    return this.request(`/applications/${applicationId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason, confirmed }),
    });
  }

  // Notes
  async addNote(applicationId: string, content: string): Promise<any> {
    return this.request(`/applications/${applicationId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Matching Re-evaluate
  async reEvaluateJob(jobId: string): Promise<any> {
    return this.request(`/matching/re-evaluate?job_id=${jobId}`, {
      method: 'POST',
    });
  }

  // Audit Logs
  async getAuditLogs(params: { application_id?: string; action?: string; page?: number }): Promise<{
    total: number;
    items: AuditLogItem[];
  }> {
    const query = new URLSearchParams();
    if (params.application_id) query.set('application_id', params.application_id);
    if (params.action) query.set('action', params.action);
    if (params.page) query.set('page', params.page.toString());

    return this.request<{ total: number; items: AuditLogItem[] }>(`/audit?${query.toString()}`);
  }

  // Export
  getExportCsvUrl(jobId?: string): string {
    const query = jobId ? `?job_id=${jobId}` : '';
    return `${API_BASE}/export/candidates.csv${query}`;
  }

  // Compliance & Regulatory Audit
  async getComplianceMetrics(): Promise<ComplianceMetricsResponse> {
    return this.request<ComplianceMetricsResponse>('/compliance/metrics');
  }

  // AI Interview Guide Synthesizer
  async getInterviewGuide(applicationId: string): Promise<InterviewGuideResponse> {
    return this.request<InterviewGuideResponse>(`/interviews/${applicationId}`);
  }

  async generateInterviewGuide(applicationId: string): Promise<InterviewGuideResponse> {
    return this.request<InterviewGuideResponse>(`/interviews/${applicationId}/generate`, {
      method: 'POST',
    });
  }

  // Talent Pool Rediscovery
  async getTalentRediscovery(jobId: string, minScore = 50): Promise<RediscoveryResponse> {
    return this.request<RediscoveryResponse>(`/rediscovery/${jobId}?min_score=${minScore}`);
  }

  // Enterprise Webhooks
  async getWebhooks(): Promise<WebhookSubscription[]> {
    return this.request<WebhookSubscription[]>('/webhooks');
  }

  async createWebhook(data: WebhookCreate): Promise<WebhookSubscription> {
    return this.request<WebhookSubscription>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    return this.request<void>(`/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  // Side-by-Side Candidate Comparison
  async compareCandidates(applicationIds: string[], blindMode = false): Promise<CandidateComparisonResponse> {
    return this.request<CandidateComparisonResponse>(`/candidates/compare?blind_mode=${blindMode}`, {
      method: 'POST',
      body: JSON.stringify({ application_ids: applicationIds }),
    });
  }

  // Candidate Communication Hub
  async previewCandidateEmail(req: EmailPreviewRequest): Promise<EmailPreviewResponse> {
    return this.request<EmailPreviewResponse>('/communications/preview', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async sendCandidateEmail(req: SendEmailRequest): Promise<CommunicationLogResponse> {
    return this.request<CommunicationLogResponse>('/communications/send', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getCandidateCommunications(applicationId: string): Promise<CommunicationLogResponse[]> {
    return this.request<CommunicationLogResponse[]>(`/communications/${applicationId}`);
  }
}

export const api = new ApiClient();

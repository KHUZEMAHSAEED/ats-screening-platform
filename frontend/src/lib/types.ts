export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface MandatorySkillItem {
  name: string;
  min_years: number;
  synonyms: string[];
}

export interface PreferredSkillItem {
  name: string;
  weight: number;
  synonyms: string[];
}

export interface QualificationItem {
  degree: string;
  field?: string;
  required: boolean;
}

export interface CriteriaWeights {
  mandatory: number;
  preferred: number;
  experience: number;
  qualifications: number;
}

export interface ScreeningCriteria {
  id?: string;
  job_id?: string;
  mandatory_skills: MandatorySkillItem[];
  preferred_skills: PreferredSkillItem[];
  min_experience_years: number;
  required_qualifications: QualificationItem[];
  weights: CriteriaWeights;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  description: string;
  responsibilities?: string;
  location?: string;
  work_arrangement?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  criteria?: ScreeningCriteria;
  applications_count: number;
}

export interface CandidateListItem {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  anonymized_id: string;
  email?: string;
  phone?: string;
  job_id: string;
  job_title: string;
  job_department: string;
  overall_score: number | null;
  matched_mandatory_count: number;
  total_mandatory_count: number;
  missing_mandatory: string[];
  recommendation_status: 'RECOMMENDED_FOR_SHORTLISTING' | 'NEEDS_HR_REVIEW' | 'DOES_NOT_MEET_CRITERIA' | 'PROCESSING_FAILED';
  hr_decision: 'PENDING_REVIEW' | 'SHORTLISTED' | 'ON_HOLD' | 'REJECTED';
  processing_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total_experience_years?: number;
  created_at: string;
}

export interface CriterionEvidence {
  name: string;
  category: string;
  matched: boolean;
  evidence_snippet?: string;
  confidence?: number;
}

export interface UncertainCriterion {
  name: string;
  reason: string;
  evidence_snippet?: string;
}

export interface MatchResult {
  id: string;
  application_id: string;
  overall_score: number;
  score_breakdown: {
    mandatory_score: number;
    preferred_score: number;
    experience_score: number;
    qualification_score: number;
    weights_applied: Record<string, number>;
    overall_score: number;
  };
  matched_mandatory: CriterionEvidence[];
  missing_mandatory: string[];
  matched_preferred: CriterionEvidence[];
  missing_preferred: string[];
  uncertain_criteria: UncertainCriterion[];
  explanation: string;
  evaluated_at: string;
}

export interface ParsedResumeData {
  extracted_text: string;
  skills: string[];
  experience_items: Array<{
    start_year?: number;
    end_year?: number;
    duration_years?: number;
    snippet?: string;
  }>;
  total_experience_years: number;
  education: Array<{
    degree: string;
    institution?: string;
    graduation_year?: number;
  }>;
  certifications: string[];
  projects: any[];
  extraction_warnings: string[];
  parsing_method: string;
  parsed_at: string;
}

export interface ResumeDocument {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  upload_status: string;
  error_message?: string;
  created_at: string;
}

export interface HRDecision {
  id: string;
  application_id: string;
  user_id: string;
  reviewer_name?: string;
  decision: string;
  reason?: string;
  is_override: boolean;
  created_at: string;
}

export interface CandidateNote {
  id: string;
  application_id: string;
  user_id: string;
  author_name?: string;
  content: string;
  created_at: string;
}

export interface CandidateDetail {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  anonymized_id: string;
  email?: string;
  phone?: string;
  location?: string;
  job_id: string;
  job_title: string;
  job_department: string;
  recommendation_status: string;
  hr_decision: string;
  processing_status: string;
  applied_at: string;
  resume: ResumeDocument;
  parsed_data?: ParsedResumeData;
  match_result?: MatchResult;
  decisions: HRDecision[];
  notes: CandidateNote[];
}

export interface DashboardSummary {
  total_uploaded_resumes: number;
  resumes_processed: number;
  recommended_for_shortlisting: number;
  awaiting_hr_review: number;
  shortlisted_by_hr: number;
  rejected_by_hr: number;
  on_hold_by_hr: number;
  processing_failures: number;
}

export interface AuditLogItem {
  id: string;
  application_id?: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface InterviewQuestionItem {
  question: string;
  category: string;
  target_gap: string;
  expected_answer: string;
  suggested_rubric: string;
}

export interface InterviewGuideResponse {
  id: string;
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  job_title: string;
  questions: InterviewQuestionItem[];
  created_at: string;
}

export interface ComplianceMetricsResponse {
  total_evaluated: number;
  shortlisted_count: number;
  selection_rate: number;
  disparate_impact_ratio: number;
  four_fifths_rule_status: 'COMPLIANT' | 'POTENTIAL_DISPARATE_IMPACT';
  compliance_explanation: string;
  recommendation_distribution: Record<string, number>;
  decision_distribution: Record<string, number>;
  regulatory_frameworks: string[];
  audit_timestamp: string;
}

export interface RediscoveredCandidate {
  candidate_id: string;
  anonymized_id: string;
  candidate_name: string;
  email?: string;
  original_job_title: string;
  target_job_title: string;
  match_score: number;
  matched_mandatory: string[];
  missing_mandatory: string[];
  recommendation: string;
  resume_id: string;
}

export interface RediscoveryResponse {
  job_id: string;
  job_title: string;
  total_pool_evaluated: number;
  matches_found: number;
  candidates: RediscoveredCandidate[];
}

export interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  event_types: string[];
  is_active: boolean;
  description?: string;
  created_at: string;
}

export interface WebhookCreate {
  url: string;
  event_types: string[];
  description?: string;
}

export interface ComparisonCriterionMatch {
  name: string;
  category: string;
  min_years?: number;
  candidate_matches: Record<string, boolean>;
  candidate_evidence: Record<string, string | null>;
}

export interface CandidateComparisonItem {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  anonymized_id: string;
  email?: string;
  overall_score: number;
  recommendation_status: string;
  hr_decision: string;
  total_experience_years: number;
  mandatory_score: number;
  preferred_score: number;
  experience_score: number;
  qualification_score: number;
  matched_mandatory_count: number;
  total_mandatory_count: number;
  top_skills: string[];
  education_degree?: string;
  education_institution?: string;
  extraction_method: string;
}

export interface CandidateComparisonResponse {
  job_id: string;
  job_title: string;
  job_department: string;
  candidates: CandidateComparisonItem[];
  criteria_matrix: ComparisonCriterionMatch[];
  executive_summary: string;
}

export interface EmailPreviewRequest {
  application_id: string;
  template_type: 'INTERVIEW_INVITATION' | 'COMPETENCY_CLARIFICATION' | 'RESPECTFUL_REJECTION' | 'OFFER_OR_NEXT_STEPS' | 'CUSTOM';
  custom_note?: string;
}

export interface EmailPreviewResponse {
  template_type: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  body: string;
  placeholders: Record<string, string>;
}

export interface SendEmailRequest {
  application_id: string;
  template_type: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  body: string;
  confirmed_by_recruiter: boolean;
}

export interface CommunicationLogResponse {
  id: string;
  application_id: string;
  recipient_name: string;
  recipient_email: string;
  template_type: string;
  subject: string;
  body: string;
  status: string;
  sent_at: string;
  sender_name?: string;
}

export interface LLMCompetencyProof {
  skill: string;
  evidence_quote: string;
  depth_level: string;
  context_source?: string;
}

export interface LLMAnalysisResponse {
  application_id: string;
  candidate_id: string;
  candidate_name?: string;
  job_title: string;
  executive_summary: string;
  technical_depth_score: number;
  verified_competencies: LLMCompetencyProof[];
  potential_risk_factors: string[];
  key_achievements: string[];
  recommended_interview_focus: string[];
  prompt_injection_detected: boolean;
  provider_used: string;
  analyzed_at: string;
}


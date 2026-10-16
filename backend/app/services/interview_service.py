from typing import List, Dict, Any
from app.schemas.interview import InterviewQuestionItem

def generate_interview_questions_for_candidate(
    candidate_name: str,
    job_title: str,
    matched_mandatory: List[Dict[str, Any]],
    missing_mandatory: List[str],
    uncertain_criteria: List[Dict[str, Any]],
    skills: List[str]
) -> List[InterviewQuestionItem]:
    """
    Synthesizes tailored, role-specific technical and behavioral interview probes
    targeting the candidate's exact qualification gaps and uncertainties.
    """
    questions: List[InterviewQuestionItem] = []

    # 1. Probe Uncertain Criteria (Highest priority for recruiter verification)
    for u in uncertain_criteria:
        name = u.get("name", "Experience Duration")
        reason = u.get("reason", "Ambiguous detail in resume")

        if "experience" in name.lower() or "tenure" in name.lower():
            questions.append(InterviewQuestionItem(
                category="Employment Timeline Verification",
                target_gap=f"Uncertainty: {reason}",
                question=f"Could you walk us through the chronological timeline of your recent software roles, specifically clarifying the duration and overlap between your principal positions?",
                expected_answer="Candidate clearly explains tenure dates, project transitions, and full-time vs contracting engagements without contradictions.",
                suggested_rubric="Score 1-5: 5 = Crisp verifiable dates matching background check; 1 = Evasive or contradictory timeline."
            ))
        elif "document length" in name.lower():
            questions.append(InterviewQuestionItem(
                category="Breadth of Technical Experience",
                target_gap="Resume was condensed or sparse",
                question=f"Your resume highlights key technical milestones in a concise summary. Could you detail the architecture of the most complex production system you personally engineered?",
                expected_answer="Candidate provides architectural diagrams, throughput metrics, microservice boundaries, and database trade-offs.",
                suggested_rubric="Score 1-5: 5 = Deep architectural mastery with concrete production metrics; 1 = High-level buzzwords only."
            ))

    # 2. Probe Missing Mandatory Requirements
    for missing in missing_mandatory[:2]:  # Focus on top 2 missing skills
        questions.append(InterviewQuestionItem(
            category="Missing Requirement Investigation",
            target_gap=f"Missing Mandatory Skill: {missing}",
            question=f"The role requirements emphasize production experience with {missing}. What exposure, equivalent frameworks, or transferable systems have you operated that prepare you to be productive in {missing} immediately?",
            expected_answer=f"Candidate articulates foundational principles of {missing} or demonstrates deep expertise in an equivalent direct counterpart.",
            suggested_rubric=f"Score 1-5: 5 = Strong transferable foundation with rapid ramp-up ability; 1 = Zero familiarity or awareness."
        ))

    # 3. Deep-Dive on Verified Strengths (Verify actual proficiency vs resume keyword stuffing)
    if matched_mandatory:
        primary_skill = matched_mandatory[0].get("name", "Core Tech")
        questions.append(InterviewQuestionItem(
            category="Technical Depth Verification",
            target_gap=f"Verifying Proficiency in: {primary_skill}",
            question=f"You have notable experience with {primary_skill}. Can you describe a critical production incident or performance bottleneck you diagnosed in {primary_skill}, and how you resolved it under pressure?",
            expected_answer="Candidate outlines telemetry analysis, root-cause isolation (memory leak, thread contention, slow query, or lock timeout), and sustainable patch.",
            suggested_rubric="Score 1-5: 5 = Rigorous systematic triage methodology; 1 = Superficial understanding."
        ))

    # 4. Standard System Engineering & Architecture Probe
    questions.append(InterviewQuestionItem(
        category="System Architecture & Scalability",
        target_gap=f"Senior Execution for {job_title}",
        question="How do you approach database schema migrations and backward compatibility when deploying continuous service updates in a zero-downtime environment?",
        expected_answer="Candidate discusses expand-and-contract schema migrations, backward-compatible serializers, and blue-green or rolling canary deployments.",
        suggested_rubric="Score 1-5: 5 = Expert zero-downtime operational strategy; 1 = Unaware of migration hazards."
    ))

    return questions

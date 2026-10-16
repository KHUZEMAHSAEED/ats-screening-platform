from typing import Dict, Any, List

def generate_match_explanation(
    overall_score: float,
    breakdown: Dict[str, Any],
    matched_mandatory: List[Dict[str, Any]],
    missing_mandatory: List[str],
    matched_preferred: List[Dict[str, Any]],
    missing_preferred: List[str],
    uncertain_criteria: List[Dict[str, Any]],
    candidate_exp: float,
    min_exp: float,
    recommendation: str
) -> str:
    lines = []
    lines.append(f"Candidate Overall Match Score: {overall_score:.1f}/100")
    lines.append(f"Automated Advisory Recommendation: {recommendation}")
    lines.append("")

    # Mandatory skills breakdown
    mand_total = len(matched_mandatory) + len(missing_mandatory)
    if mand_total > 0:
        lines.append(f"1. Mandatory Requirements ({len(matched_mandatory)}/{mand_total} matched - {breakdown.get('mandatory_score', 0):.0f}%):")
        if matched_mandatory:
            matched_names = ", ".join(m["name"] for m in matched_mandatory)
            lines.append(f"   - Verified: {matched_names}")
        if missing_mandatory:
            missing_names = ", ".join(missing_mandatory)
            lines.append(f"   - Missing or unverified: {missing_names}")
    else:
        lines.append("1. Mandatory Requirements: None specified for this opening.")

    # Preferred skills breakdown
    pref_total = len(matched_preferred) + len(missing_preferred)
    if pref_total > 0:
        lines.append(f"2. Preferred Skills ({len(matched_preferred)}/{pref_total} matched - {breakdown.get('preferred_score', 0):.0f}%):")
        if matched_preferred:
            matched_names = ", ".join(m["name"] for m in matched_preferred)
            lines.append(f"   - Identified: {matched_names}")
        if missing_preferred:
            missing_names = ", ".join(missing_preferred)
            lines.append(f"   - Absent: {missing_names}")

    # Experience evaluation
    lines.append(f"3. Experience: Extracted {candidate_exp:.1f} years vs {min_exp:.1f} years required ({breakdown.get('experience_score', 0):.0f}%).")

    # Qualifications evaluation
    lines.append(f"4. Qualifications Score: {breakdown.get('qualification_score', 0):.0f}%.")

    # Uncertain criteria
    if uncertain_criteria:
        lines.append("")
        lines.append("Uncertainties Requiring Human Clarification:")
        for u in uncertain_criteria:
            lines.append(f"   * {u['name']}: {u['reason']}")

    lines.append("")
    lines.append("HUMAN OVERSIGHT NOTICE: This score is a deterministic heuristic breakdown. Final candidate qualification, shortlisting, and rejection decisions must be validated and executed by an authorized HR recruiter.")

    return "\n".join(lines)

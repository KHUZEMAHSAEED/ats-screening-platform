from typing import Dict, Any, List
from app.services.matching.synonym_dict import get_synonyms_for
from app.services.matching.normalizer import find_term_in_text, normalize_text
from app.services.matching.explainability import generate_match_explanation
from app.models import RecommendationStatus

def evaluate_candidate_match(
    parsed_resume: Dict[str, Any],
    criteria_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Modular deterministic matching engine.
    Compares extracted candidate facts against configurable job criteria.
    Only active criteria categories contribute weight to the score.
    """
    raw_text = parsed_resume.get("extracted_text", "")
    extracted_skills = set(s.lower() for s in parsed_resume.get("skills", []))
    candidate_exp = float(parsed_resume.get("total_experience_years", 0.0))
    education_items = parsed_resume.get("education", [])

    mandatory_criteria = criteria_data.get("mandatory_skills", [])
    preferred_criteria = criteria_data.get("preferred_skills", [])
    min_exp = float(criteria_data.get("min_experience_years", 0.0))
    required_quals = criteria_data.get("required_qualifications", [])
    configured_weights = criteria_data.get("weights", {}) or {}

    w_mand_cfg = float(configured_weights.get("mandatory", 50.0))
    w_pref_cfg = float(configured_weights.get("preferred", 25.0))
    w_exp_cfg = float(configured_weights.get("experience", 15.0))
    w_qual_cfg = float(configured_weights.get("qualifications", 10.0))

    matched_mandatory = []
    missing_mandatory = []
    uncertain_criteria = []

    # 1. Evaluate Mandatory Requirements
    for item in mandatory_criteria:
        name = item.get("name", "") if isinstance(item, dict) else str(item)
        if not name:
            continue
        
        synonyms = [name]
        if isinstance(item, dict):
            synonyms.extend(item.get("synonyms", []))
        synonyms.extend(get_synonyms_for(name))

        found = False
        evidence_snippet = None

        for term in synonyms:
            if term.lower() in extracted_skills:
                found = True
                _, snippet = find_term_in_text(term, raw_text)
                evidence_snippet = snippet or f"Explicit skill match: {term}"
                break
            found_in_text, snippet = find_term_in_text(term, raw_text)
            if found_in_text:
                found = True
                evidence_snippet = snippet
                break

        if found:
            matched_mandatory.append({
                "name": name,
                "category": "mandatory",
                "matched": True,
                "evidence_snippet": evidence_snippet,
                "confidence": 1.0
            })
        else:
            missing_mandatory.append(name)

    # 2. Evaluate Preferred Skills
    matched_preferred = []
    missing_preferred = []
    pref_score_accum = 0.0
    pref_weight_total = 0.0

    for item in preferred_criteria:
        name = item.get("name", "") if isinstance(item, dict) else str(item)
        item_weight = float(item.get("weight", 1.0)) if isinstance(item, dict) else 1.0
        pref_weight_total += item_weight

        synonyms = [name]
        if isinstance(item, dict):
            synonyms.extend(item.get("synonyms", []))
        synonyms.extend(get_synonyms_for(name))

        found = False
        evidence_snippet = None

        for term in synonyms:
            if term.lower() in extracted_skills:
                found = True
                _, snippet = find_term_in_text(term, raw_text)
                evidence_snippet = snippet or f"Identified preferred skill: {term}"
                break
            found_in_text, snippet = find_term_in_text(term, raw_text)
            if found_in_text:
                found = True
                evidence_snippet = snippet
                break

        if found:
            matched_preferred.append({
                "name": name,
                "category": "preferred",
                "matched": True,
                "evidence_snippet": evidence_snippet,
                "confidence": 1.0
            })
            pref_score_accum += item_weight
        else:
            missing_preferred.append(name)

    # 3. Dynamic Weight Assignment: Only active categories count
    active_weights = {}
    weighted_sum = 0.0

    if mandatory_criteria:
        s_mand = (len(matched_mandatory) / len(mandatory_criteria)) * 100.0
        active_weights["mandatory"] = w_mand_cfg
        weighted_sum += w_mand_cfg * s_mand
    else:
        s_mand = 100.0

    if preferred_criteria and pref_weight_total > 0:
        s_pref = (pref_score_accum / pref_weight_total) * 100.0
        active_weights["preferred"] = w_pref_cfg
        weighted_sum += w_pref_cfg * s_pref
    else:
        s_pref = 0.0

    if min_exp > 0:
        s_exp = min(100.0, (candidate_exp / min_exp) * 100.0)
        active_weights["experience"] = w_exp_cfg
        weighted_sum += w_exp_cfg * s_exp
    else:
        s_exp = 0.0

    if required_quals:
        matched_quals_count = 0
        edu_text = " ".join(str(e.get("degree", "")) for e in education_items).lower()
        for q in required_quals:
            q_deg = (q.get("degree", "") if isinstance(q, dict) else str(q)).lower()
            if q_deg and (q_deg in edu_text or q_deg in raw_text.lower()):
                matched_quals_count += 1
        s_qual = (matched_quals_count / len(required_quals)) * 100.0
        active_weights["qualifications"] = w_qual_cfg
        weighted_sum += w_qual_cfg * s_qual
    else:
        s_qual = 0.0

    total_weight = sum(active_weights.values())
    if total_weight > 0:
        overall_score = weighted_sum / total_weight
    else:
        overall_score = 100.0

    overall_score = round(max(0.0, min(100.0, overall_score)), 1)

    # 4. Uncertain Criteria Detection
    if len(raw_text.strip()) < 40:
        uncertain_criteria.append({
            "name": "Document Length",
            "reason": "Resume text is sparse or could not be fully extracted; manual inspection recommended."
        })
    if candidate_exp == 0.0 and min_exp > 0:
        uncertain_criteria.append({
            "name": "Experience Duration",
            "reason": "Explicit employment date ranges could not be parsed automatically from resume."
        })

    # 5. Recommendation Category
    if len(missing_mandatory) == 0 and overall_score >= 70.0 and (min_exp == 0 or candidate_exp >= min_exp):
        rec_status = RecommendationStatus.RECOMMENDED_FOR_SHORTLISTING.value
    elif len(missing_mandatory) > 0 and overall_score < 50.0:
        rec_status = RecommendationStatus.DOES_NOT_MEET_CRITERIA.value
    elif overall_score >= 50.0 or (mandatory_criteria and s_mand >= 60.0) or uncertain_criteria:
        rec_status = RecommendationStatus.NEEDS_HR_REVIEW.value
    else:
        rec_status = RecommendationStatus.DOES_NOT_MEET_CRITERIA.value

    if len(raw_text.strip()) == 0:
        rec_status = RecommendationStatus.PROCESSING_FAILED.value

    breakdown = {
        "mandatory_score": round(s_mand, 1),
        "preferred_score": round(s_pref, 1),
        "experience_score": round(s_exp, 1),
        "qualification_score": round(s_qual, 1),
        "weights_applied": active_weights,
        "overall_score": overall_score
    }

    explanation = generate_match_explanation(
        overall_score=overall_score,
        breakdown=breakdown,
        matched_mandatory=matched_mandatory,
        missing_mandatory=missing_mandatory,
        matched_preferred=matched_preferred,
        missing_preferred=missing_preferred,
        uncertain_criteria=uncertain_criteria,
        candidate_exp=candidate_exp,
        min_exp=min_exp,
        recommendation=rec_status
    )

    return {
        "overall_score": overall_score,
        "score_breakdown": breakdown,
        "matched_mandatory": matched_mandatory,
        "missing_mandatory": missing_mandatory,
        "matched_preferred": matched_preferred,
        "missing_preferred": missing_preferred,
        "uncertain_criteria": uncertain_criteria,
        "explanation": explanation,
        "recommendation_status": rec_status
    }

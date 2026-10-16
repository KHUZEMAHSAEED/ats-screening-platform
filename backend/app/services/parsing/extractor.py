import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

COMMON_SKILLS = [
    # Programming Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R",
    # Frontend
    "React", "Next.js", "Vue.js", "Angular", "HTML", "CSS", "Tailwind CSS", "Bootstrap", "Redux", "Svelte",
    # Backend & Frameworks
    "FastAPI", "Django", "Flask", "Node.js", "Express.js", "Spring Boot", "ASP.NET", "Ruby on Rails", "NestJS", "GraphQL", "REST API",
    # Databases & Caches
    "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Cassandra", "Oracle",
    # DevOps & Cloud
    "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Google Cloud", "CI/CD", "GitHub Actions", "GitLab CI", "Terraform", "Ansible", "Linux", "Git",
    # Data & AI
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-Learn", "NLP", "LLM", "Computer Vision",
    # Methodologies & Tools
    "Agile", "Scrum", "Jira", "Microservices", "TDD", "System Design", "Kafka", "RabbitMQ"
]

DEGREE_PATTERNS = [
    r"(?i)\b(Ph\.?D\.?|Doctor of Philosophy)\b",
    r"(?i)\b(Master of Science|Master of Arts|M\.?S\.?|M\.?A\.?|MBA|M\.?Tech)\b",
    r"(?i)\b(Bachelor of Science|Bachelor of Arts|Bachelor of Technology|Bachelor of Engineering|B\.?S\.?|B\.?A\.?|B\.?Tech|B\.?E\.?)\b",
    r"(?i)\b(Associate of Science|Associate of Arts|Associate Degree)\b",
    r"(?i)\b(Bachelor'?s|Master'?s)\s+(?:Degree|in\s+[\w\s]+)\b"
]

def extract_email(text: str) -> Optional[str]:
    match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    return match.group(0) if match else None

def extract_phone(text: str) -> Optional[str]:
    pattern = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
    match = re.search(pattern, text)
    return match.group(0).strip() if match else None

def extract_candidate_name(text: str, email: Optional[str] = None) -> Optional[str]:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return None

    # Filter out common false headers
    disallowed_words = {
        "resume", "curriculum", "vitae", "cv", "page", "email", "phone", "contact",
        "profile", "summary", "address", "experience", "education", "skills"
    }

    for line in lines[:6]:  # Inspect first few lines
        clean = re.sub(r"[^\w\s\.]", "", line).strip()
        words = clean.split()
        if 2 <= len(words) <= 4:
            lower_words = set(w.lower() for w in words)
            if not lower_words.intersection(disallowed_words) and not any(char.isdigit() for char in clean):
                return clean.title()

    # Fallback: if email exists, deduce from email prefix (e.g. john.doe@email.com -> John Doe)
    if email:
        local_part = email.split("@")[0]
        cleaned = re.sub(r"[._-]", " ", local_part)
        words = [w.capitalize() for w in cleaned.split() if w.isalpha()]
        if len(words) >= 2:
            return " ".join(words)
    return None

def extract_skills(text: str) -> List[str]:
    found_skills = set()
    text_lower = text.lower()

    for skill in COMMON_SKILLS:
        # Match word boundaries
        pattern = r"(?i)(?<!\w)" + re.escape(skill) + r"(?!\w)"
        if re.search(pattern, text):
            found_skills.add(skill)

    # Sort alphabetically
    return sorted(list(found_skills))

def extract_education(text: str) -> List[Dict[str, Any]]:
    results = []
    lines = text.split("\n")
    current_year = datetime.now().year

    for i, line in enumerate(lines):
        for pattern in DEGREE_PATTERNS:
            match = re.search(pattern, line)
            if match:
                degree = match.group(0).strip()
                # Find possible graduation year in this line or next line
                surrounding = " ".join(lines[max(0, i - 1):min(len(lines), i + 2)])
                year_match = re.search(r"\b(19\d{2}|20\d{2})\b", surrounding)
                grad_year = int(year_match.group(1)) if year_match else None
                
                # Check for University / College
                inst_match = re.search(r"(?i)\b([\w\s]+(?:University|College|Institute|Polytechnic|Academy))\b", surrounding)
                institution = inst_match.group(0).strip() if inst_match else None

                results.append({
                    "degree": degree,
                    "institution": institution,
                    "graduation_year": grad_year
                })
                break
    # De-duplicate
    deduped = []
    seen = set()
    for item in results:
        key = (item["degree"].lower(), item["institution"] or "")
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped

def extract_experience_and_tenure(text: str) -> Tuple[List[Dict[str, Any]], float]:
    """
    Finds date ranges (e.g. '2019 - 2023', 'Jan 2020 - Present') and calculates estimated years.
    """
    experience_items = []
    current_year = datetime.now().year
    total_years = 0.0

    # Pattern for year ranges: 2018 - 2022, 2020 - Present, etc.
    year_range_pattern = r"\b(19\d{2}|20\d{2})\s*(?:-|–|—|to)\s*(19\d{2}|20\d{2}|Present|Current|Ongoing)\b"
    matches = list(re.finditer(year_range_pattern, text, re.IGNORECASE))

    intervals = []
    for m in matches:
        start_year = int(m.group(1))
        end_str = m.group(2).lower()
        if "present" in end_str or "current" in end_str or "ongoing" in end_str:
            end_year = current_year
        else:
            end_year = int(m.group(2))

        if 1970 <= start_year <= current_year and end_year >= start_year:
            duration = max(0.5, float(end_year - start_year))
            intervals.append((start_year, end_year, duration))

            # Context snippet around the date
            start_pos = max(0, m.start() - 100)
            end_pos = min(len(text), m.end() + 150)
            snippet = text[start_pos:end_pos].replace("\n", " ").strip()

            experience_items.append({
                "start_year": start_year,
                "end_year": end_year,
                "duration_years": duration,
                "snippet": snippet
            })

    # Merge overlapping intervals to avoid double counting years
    if intervals:
        intervals.sort(key=lambda x: x[0])
        merged = [intervals[0]]
        for curr in intervals[1:]:
            prev_start, prev_end, _ = merged[-1]
            if curr[0] <= prev_end:
                merged[-1] = (prev_start, max(prev_end, curr[1]), max(prev_end, curr[1]) - prev_start)
            else:
                merged.append(curr)
        total_years = sum(interval[1] - interval[0] for interval in merged)

    return experience_items, round(float(total_years), 1)

def extract_certifications(text: str) -> List[str]:
    cert_keywords = [
        "AWS Certified Solutions Architect", "AWS Certified Developer", "AWS Certified",
        "Google Cloud Certified", "GCP Professional Data Engineer",
        "Microsoft Certified: Azure", "Azure Fundamentals", "Azure Solutions Architect",
        "Certified Kubernetes Administrator (CKA)", "CKA", "CKAD",
        "Project Management Professional (PMP)", "PMP", "Scrum Master", "CSM",
        "CISSP", "CompTIA Security+", "CompTIA Network+", "Certified Ethical Hacker (CEH)"
    ]
    found = []
    for cert in cert_keywords:
        pattern = r"(?i)(?<!\w)" + re.escape(cert) + r"(?!\w)"
        if re.search(pattern, text):
            found.append(cert)
    return sorted(list(set(found)))

def parse_raw_text_heuristics(text: str) -> Dict[str, Any]:
    email = extract_email(text)
    phone = extract_phone(text)
    name = extract_candidate_name(text, email=email)
    skills = extract_skills(text)
    education = extract_education(text)
    exp_items, total_exp = extract_experience_and_tenure(text)
    certifications = extract_certifications(text)

    return {
        "candidate_name": name,
        "email": email,
        "phone": phone,
        "skills": skills,
        "education": education,
        "experience_items": exp_items,
        "total_experience_years": total_exp,
        "certifications": certifications,
        "projects": [],
        "warnings": []
    }

import re
from typing import Optional, Tuple

def normalize_text(text: str) -> str:
    if not text:
        return ""
    # Normalize unicode whitespaces
    return re.sub(r"\s+", " ", text).strip().lower()

def find_term_in_text(term: str, text: str) -> Tuple[bool, Optional[str]]:
    """
    Looks for a specific term inside full text respecting word boundaries.
    Returns: (found, snippet_excerpt)
    """
    if not term or not text:
        return False, None

    term_clean = term.strip()
    # Handle special characters in tech terms like C++, C#, .NET, Node.js
    escaped = re.escape(term_clean)
    
    # Boundary pattern that accommodates punctuation-heavy tech names
    if term_clean.startswith("."):
        pattern = r"(?i)(?<=\s)" + escaped + r"(?=\s|[.,;!?]|$)"
    elif term_clean.endswith("+") or term_clean.endswith("#"):
        pattern = r"(?i)(?:\b|\s)" + escaped + r"(?=\s|[.,;!?]|$)"
    else:
        pattern = r"(?i)\b" + escaped + r"\b"

    match = re.search(pattern, text)
    if match:
        start = max(0, match.start() - 60)
        end = min(len(text), match.end() + 60)
        snippet = text[start:end].replace("\n", " ").strip()
        return True, f"...{snippet}..."
    return False, None

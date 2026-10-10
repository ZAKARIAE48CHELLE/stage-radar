from __future__ import annotations

import re
import unicodedata
from functools import lru_cache

CITIES = ["Casablanca", "Rabat", "Tanger", "Marrakech", "Bouskoura", "Fès", "Agadir", "Kénitra",
          "Mohammedia", "Tétouan", "Oujda", "Meknès", "Salé", "Témara", "El Jadida", "Settat",
          "Benguerir", "Laâyoune", "Nador", "Skhirat"]


def norm(s: str) -> str:
    """Lowercase, strip accents, collapse whitespace and apostrophes."""
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", s)


@lru_cache(maxsize=2048)
def _pattern(kw: str) -> re.Pattern:
    k = re.escape(norm(kw)).replace(r"\ ", r"[\s\-]+")
    return re.compile(rf"(?<![a-z0-9]){k}(?![a-z0-9])")


def find_keywords(text_norm: str, keywords: list[str]) -> dict[str, int]:
    """Return {keyword: occurrences} for keywords present in already-normalised text."""
    out = {}
    for kw in keywords:
        n = len(_pattern(kw).findall(text_norm))
        if n:
            out[kw] = n
    return out


def contains_any(text_norm: str, keywords: list[str]) -> bool:
    return any(_pattern(k).search(text_norm) for k in keywords)

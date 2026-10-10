from __future__ import annotations

from dataclasses import dataclass, field, asdict


@dataclass
class Offer:
    url: str
    source: str
    title: str
    company: str = ""
    city: str = ""
    modality: str = ""          # "Télétravail" | "Hybride" | "Sur site" | ""
    date_posted: str = ""       # ISO date (YYYY-MM-DD)
    valid_through: str = ""     # ISO date or ""
    employment_type: str = ""   # e.g. INTERN, FULL_TIME
    description: str = ""       # plain text
    logo: str = ""
    # filled by scoring
    axis_hits: dict = field(default_factory=dict)
    keywords: list = field(default_factory=list)
    domain: str = ""
    bonus: int = 0
    score: int = 0
    is_pfe: bool = False
    is_paid: bool = False

    def to_dict(self) -> dict:
        return asdict(self)

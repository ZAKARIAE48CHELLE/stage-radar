"""Relevance filtering + profile match scoring.

The SAME formula is re-implemented in docs/index.html (function computeScore) so the
dashboard sliders recompute scores exactly. Change both together.

  hits_i    = distinct keywords of axis i found (a keyword in the title counts twice)
  pref_i    = weight_i / max(weights)                         (0..1)
  fit       = Σ (hits_i / Σhits) · pref_i                     (0..1) how much the offer leans
                                                               toward what you prefer
  intensity = min(1, Σhits / 12)                               (0..1) how clearly it is your field
  score     = round(100 · (0.6·fit + 0.4·intensity)) + bonus, capped to 100
"""
from __future__ import annotations

from datetime import date, timedelta

from .models import Offer
from .text import norm, find_keywords, contains_any


def compute_score(axis_hits: dict, weights: dict, bonus: int = 0) -> int:
    total = sum(axis_hits.values())
    if total <= 0:
        return 0
    wmax = max(weights.values()) or 1
    fit = sum((axis_hits.get(a, 0) / total) * (w / wmax) for a, w in weights.items())
    intensity = min(1.0, total / 12)
    return int(min(100, round(100 * (0.6 * fit + 0.4 * intensity)) + bonus))


def analyse(offer: Offer, cfg: dict) -> Offer:
    title_n = norm(offer.title)
    body_n = norm(offer.description)
    axis_hits, kws = {}, []
    for axis, spec in cfg["axes"].items():
        in_title = find_keywords(title_n, spec["keywords"])
        in_body = find_keywords(body_n, spec["keywords"])
        found = set(in_title) | set(in_body)
        axis_hits[axis] = len(found) + len(in_title)  # title mentions weigh double
        kws.extend(sorted(found))
    offer.axis_hits = axis_hits
    offer.keywords = list(dict.fromkeys(kws))
    dominant = max(axis_hits, key=axis_hits.get) if any(axis_hits.values()) else ""
    offer.domain = cfg["axes"][dominant]["label"] if dominant else "Autre"

    full = title_n + " " + body_n
    offer.is_pfe = contains_any(full, ["pfe", "fin d'etudes", "fin d etudes", "projet de fin"])
    prefs = [norm(c) for c in cfg["candidate"].get("preferred_cities", [])]
    bonus = cfg["scoring"]["pfe_bonus"] if offer.is_pfe else 0
    if norm(offer.city) in prefs or (offer.modality == "Télétravail" and "teletravail" in prefs):
        bonus += cfg["scoring"]["city_bonus"]
    offer.bonus = bonus
    offer.score = compute_score(axis_hits, cfg["weights"], bonus)
    return offer


def is_relevant(offer: Offer, cfg: dict, today: date | None = None) -> tuple[bool, str]:
    """Return (keep, reason). Call after analyse()."""
    f = cfg["filters"]
    today = today or date.today()
    title_n = norm(offer.title)
    full = title_n + " " + norm(offer.description)

    if contains_any(title_n, f["title_exclude_any"]):
        return False, "title excluded"
    if not contains_any(full, f["field_any"]):
        return False, "not data/AI"
    min_hits = f["min_keyword_hits"] if len(offer.description) >= 600 else f.get("min_keyword_hits_short", 1)
    if sum(offer.axis_hits.values()) < min_hits:
        return False, "too few skill keywords"
    if f.get("require_internship"):
        intern = "INTERN" in offer.employment_type.upper() or contains_any(full, f["internship_any"])
        if not intern:
            return False, "not an internship"
    if offer.date_posted:
        try:
            if date.fromisoformat(offer.date_posted) < today - timedelta(days=f["max_age_days"]):
                return False, "too old"
        except ValueError:
            pass
    if f.get("drop_expired") and offer.valid_through:
        try:
            if date.fromisoformat(offer.valid_through) < today:
                return False, "expired"
        except ValueError:
            pass
    return True, "ok"

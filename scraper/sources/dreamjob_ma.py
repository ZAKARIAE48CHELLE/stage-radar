"""dreamjob.ma source — via the site's public WordPress REST API.

robots.txt allows all crawlers except /wp-admin/. We page through
/wp-json/wp/v2/posts?after=<date> (one JSON request per 50 posts, no HTML pages fetched).
Posts are articles announcing one or several openings; the relevance filter keeps the AI/Data ones.
"""
from __future__ import annotations

import html
import logging
import re
from datetime import datetime, timedelta, timezone

from bs4 import BeautifulSoup

from ..http import PoliteSession
from ..models import Offer
from ..text import norm, CITIES

log = logging.getLogger(__name__)
NAME = "dreamjob.ma"
API = "https://www.dreamjob.ma/wp-json/wp/v2/posts"
FIELDS = "id,date,link,title,content"
# "X recrute …", "X cherche …" → company is the text before the verb
COMPANY_RE = re.compile(
    r"^(.{2,60}?)\s+(?:recrute|recrutent|cherche|recherche|lance|renforce|ouvre|embauche|offre|propose|annonce|is hiring|hiring)\b",
    re.IGNORECASE)


def _company(title: str) -> str:
    m = COMPANY_RE.match(title)
    if m:
        c = m.group(1).strip(" :-–")
        if norm(c) not in ("on", "nous", "urgent", "offre", "stage"):
            return c
    m = re.search(r"\b(?:chez|at)\s+([A-Z][\w&.\- ]{1,40}?)(?:\s+(?:à|a|au|en|dès|-)\b|$)", title)
    return m.group(1).strip() if m else ""


def _city(text: str) -> str:
    n = norm(text)
    for c in CITIES:
        if re.search(rf"(?<![a-z]){re.escape(norm(c))}(?![a-z])", n):
            return c
    return ""


def _modality(text: str) -> str:
    n = norm(text)
    if "teletravail" in n or "full remote" in n or "100% remote" in n:
        return "Télétravail"
    if "hybride" in n or "hybrid" in n:
        return "Hybride"
    return ""


def post_to_offer(p: dict) -> Offer | None:
    title = html.unescape(BeautifulSoup((p.get("title") or {}).get("rendered", ""), "lxml").get_text(" ", strip=True))
    link = p.get("link") or ""
    if not title or not link:
        return None
    body = BeautifulSoup((p.get("content") or {}).get("rendered", ""), "lxml").get_text("\n", strip=True)
    lead = title + "\n" + body[:1500]
    n = norm(title + " " + body)
    is_intern = any(k in n for k in ("stage", "stagiaire", "pfe", "internship", "fin d'etudes"))
    return Offer(
        url=link,
        source=NAME,
        title=title,
        company=_company(title),
        city=_city(lead),
        modality=_modality(lead),
        date_posted=(p.get("date") or "")[:10],
        employment_type="INTERN" if is_intern else "",
        description=body[:5000],
    )


def collect(session: PoliteSession, src: dict, max_age_days: int, known: set[str], cap: int) -> list[Offer]:
    """Return offers published within the window and not already stored (at most `cap`)."""
    since = (datetime.now(timezone.utc) - timedelta(days=min(max_age_days, src.get("lookback_days", 45))))
    after = since.strftime("%Y-%m-%dT%H:%M:%S")
    out: list[Offer] = []
    for page in range(1, src.get("max_pages", 60) + 1):
        url = f"{API}?per_page=50&page={page}&after={after}&orderby=date&order=desc&_fields={FIELDS}"
        r = session.get(url)
        if r is None:  # 400 past the last page, or network error
            break
        try:
            posts = r.json()
        except ValueError:
            log.warning("%s: non-JSON response on page %d", NAME, page)
            break
        if not isinstance(posts, list) or not posts:
            break
        new_on_page = 0
        for p in posts:
            o = post_to_offer(p)
            if o and o.url not in known:
                out.append(o)
                new_on_page += 1
        if new_on_page == 0 and page > 1:  # everything older is already stored
            break
        if len(out) >= cap or len(posts) < 50:
            break
    log.info("%s: %d new posts", NAME, len(out))
    return out[:cap]

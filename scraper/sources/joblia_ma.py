"""joblia.ma source — via the site's public WordPress REST API + JSON-LD.

Legal context: joblia.ma’s robots.txt allows all crawlers except /wp-admin/, but its
mentions légales state « Toute reproduction, totale ou partielle, sans l’accord écrit
de Joblia.ma est interdite. » So this source must stay enabled: false in
config/profile.yaml until the owner confirms permission has been granted.
"""
from __future__ import annotations

import html
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Iterable

from bs4 import BeautifulSoup

from ..http import PoliteSession
from ..models import Offer
from ..text import norm, CITIES

log = logging.getLogger(__name__)
NAME = "joblia.ma"
BASE_URL = "https://joblia.ma"
API = f"{BASE_URL}/wp-json/wp/v2/offre"
FIELDS = "id,date,link,title,excerpt,content,offre_ville,offre_secteur,offre_contrat,_links,_embedded"

# "X recrute …", "X cherche …" → company is the text before the verb
COMPANY_RE = re.compile(
    r"^(.{2,60}?)\s+(?:recrute|recrutent|cherche|recherche|lance|renforce|ouvre|embauche|offre|propose|annonce|is hiring|hiring)\b",
    re.IGNORECASE,
)

_VILLE_CACHE: dict[int, str] = {}
_CONTRAT_CACHE: dict[int, str] = {}


def _company(title: str) -> str:
    m = COMPANY_RE.match(title)
    if m:
        c = m.group(1).strip(" :-–")
        if norm(c) not in ("on", "nous", "urgent", "offre", "stage", "stage pfe"):
            return c
    m = re.search(r"\b(?:chez|at)\s+([A-Z][\w&.\- ]{1,40}?)(?:\s+(?:à|a|au|en|dès|-)\b|$)", title)
    return m.group(1).strip() if m else ""


def _city_from_text(text: str) -> str:
    n = norm(text)
    for c in CITIES:
        if re.search(rf"(?<![a-z]){re.escape(norm(c))}(?![a-z])", n):
            return c
    return ""


def _modality(text: str) -> str:
    n = norm(text)
    if "hybride" in n or "hybrid" in n:
        return "Hybride"
    if "teletravail" in n or "full remote" in n or "100% remote" in n:
        return "Télétravail"
    return ""


def _is_pfe(text: str) -> bool:
    n = norm(text)
    return any(k in n for k in ("pfe", "fin d'etudes", "fin d etudes", "projet de fin"))


def _iter_jsonld(soup: BeautifulSoup) -> Iterable[dict]:
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or tag.get_text() or "")
        except (json.JSONDecodeError, TypeError):
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            d = stack.pop()
            if isinstance(d, dict):
                if "@graph" in d:
                    stack.extend(d["@graph"])
                yield d


def _find_jobposting(soup: BeautifulSoup) -> dict | None:
    for d in _iter_jsonld(soup):
        types = d.get("@type"), d.get("additionalType")
        if any(t == "JobPosting" or (isinstance(t, list) and "JobPosting" in t) for t in types):
            return d
    return None


def _extract_embedded_terms(p: dict) -> dict[str, list[str]]:
    """Extract term names by taxonomy from WordPress _embedded."""
    out: dict[str, list[str]] = {}
    for group in p.get("_embedded", {}).get("wp:term", []):
        if not isinstance(group, list):
            continue
        for term in group:
            if isinstance(term, dict):
                tax = term.get("taxonomy")
                name = term.get("name")
                if tax and name:
                    out.setdefault(tax, []).append(html.unescape(name).strip())
    return out


def _resolve_term(session: PoliteSession | None, taxonomy: str, term_id: int) -> str:
    cache = _VILLE_CACHE if taxonomy == "offre_ville" else _CONTRAT_CACHE
    if term_id in cache:
        return cache[term_id]
    if session:
        try:
            r = session.get(f"{BASE_URL}/wp-json/wp/v2/{taxonomy}/{term_id}")
            if r is not None:
                name = (r.json() or {}).get("name", "")
                if name:
                    clean = html.unescape(name).strip()
                    cache[term_id] = clean
                    return clean
        except Exception as e:
            log.debug("%s: could not resolve term %s %d: %s", NAME, taxonomy, term_id, e)
    return ""


def resolve_content(p: dict, session: PoliteSession | None = None) -> tuple[str, dict | None]:
    """Resolve full description and optional JobPosting JSON-LD.

    1. Use content in REST object if present and non-empty.
    2. Otherwise fetch the offer page via PoliteSession and extract JobPosting JSON-LD.
    3. Fall back to REST excerpt if no JSON-LD found.
    """
    # 1) Try content field
    content_raw = (p.get("content") or {}).get("rendered", "").strip()
    if content_raw:
        body = BeautifulSoup(content_raw, "lxml").get_text("\n", strip=True)
        if len(body) > 30:
            return body, None

    # 2) Fetch individual offer page if session is provided
    link = p.get("link") or ""
    job_posting = None
    if session and link:
        resp = session.get(link)
        if resp is not None:
            soup = BeautifulSoup(resp.content, "lxml")
            job_posting = _find_jobposting(soup)
            if job_posting:
                desc = job_posting.get("description") or ""
                if desc:
                    desc_text = BeautifulSoup(desc, "lxml").get_text("\n", strip=True)
                    if desc_text:
                        return desc_text, job_posting

    # 3) Fallback to excerpt
    excerpt_raw = (p.get("excerpt") or {}).get("rendered", "").strip()
    if excerpt_raw:
        excerpt_text = BeautifulSoup(excerpt_raw, "lxml").get_text("\n", strip=True)
        return excerpt_text, job_posting

    return "", job_posting


def post_to_offer(p: dict, session: PoliteSession | None = None) -> Offer | None:
    """Convert a Joblia WordPress REST 'offre' post to an Offer model."""
    title_raw = (p.get("title") or {}).get("rendered", "")
    title = html.unescape(BeautifulSoup(title_raw, "lxml").get_text(" ", strip=True))
    link = p.get("link") or ""
    if not title or not link:
        return None

    # Resolve description & optional JobPosting
    body, job_posting = resolve_content(p, session=session)

    # Taxonomies from _embedded or cached lookup
    embedded_terms = _extract_embedded_terms(p)

    # Resolve City
    city = ""
    villes = embedded_terms.get("offre_ville", [])
    if villes:
        city = villes[0]
    elif p.get("offre_ville") and isinstance(p["offre_ville"], list):
        for vid in p["offre_ville"]:
            resolved = _resolve_term(session, "offre_ville", int(vid))
            if resolved:
                city = resolved
                break

    if not city and job_posting:
        loc = job_posting.get("jobLocation")
        if isinstance(loc, dict):
            addr = loc.get("address")
            if isinstance(addr, dict):
                city = addr.get("addressLocality") or ""
            elif isinstance(loc.get("name"), str):
                city = loc["name"]

    lead = f"{title}\n{city}\n{body[:1500]}"
    if not city:
        city = _city_from_text(lead)

    # Resolve Company
    company = _company(title)
    if not company and job_posting:
        hiring_org = job_posting.get("hiringOrganization")
        if isinstance(hiring_org, dict):
            company = (hiring_org.get("name") or "").strip()

    # Modality
    modality = _modality(lead)

    # Employment Type / Internship
    contrats = embedded_terms.get("offre_contrat", [])
    if not contrats and p.get("offre_contrat") and isinstance(p["offre_contrat"], list):
        for cid in p["offre_contrat"]:
            resolved = _resolve_term(session, "offre_contrat", int(cid))
            if resolved:
                contrats.append(resolved)

    n_all = norm(f"{title} {lead} {' '.join(contrats)}")
    is_intern = (
        any("stage" in norm(c) or "pfe" in norm(c) or "alternance" in norm(c) or "pre-embauche" in norm(c) for c in contrats)
        or any(k in n_all for k in ("stage", "stagiaire", "pfe", "internship", "fin d'etudes", "fin d etudes", "projet de fin"))
    )

    # Date posted
    date_posted = ""
    if job_posting and job_posting.get("datePosted"):
        date_posted = str(job_posting["datePosted"])[:10]
    if not date_posted:
        date_posted = (p.get("date") or "")[:10]

    return Offer(
        url=link,
        source=NAME,
        title=title,
        company=company,
        city=city,
        modality=modality,
        date_posted=date_posted,
        employment_type="INTERN" if is_intern else "",
        description=body[:5000],
        is_pfe=_is_pfe(f"{title} {body}"),
    )


def collect(session: PoliteSession, src: dict, max_age_days: int, known: set[str], cap: int) -> list[Offer]:
    """Return offers published within the window and not already stored (at most `cap`)."""
    since = datetime.now(timezone.utc) - timedelta(days=min(max_age_days, src.get("lookback_days", 45)))
    after = since.strftime("%Y-%m-%dT%H:%M:%S")
    out: list[Offer] = []
    max_pages = src.get("max_pages", 40)

    for page in range(1, max_pages + 1):
        url = (
            f"{API}?per_page=50&page={page}&after={after}&orderby=date&order=desc"
            f"&_fields={FIELDS}&_embed"
        )
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
            if not isinstance(p, dict):
                continue
            link = p.get("link") or ""
            if not link or link in known:
                continue

            o = post_to_offer(p, session=session)
            if o and o.url not in known:
                out.append(o)
                known.add(o.url)
                new_on_page += 1
                if len(out) >= cap:
                    break

        if new_on_page == 0 and page > 1:  # everything older is already stored
            break
        if len(out) >= cap or len(posts) < 50:
            break

    log.info("%s: %d new offers collected", NAME, len(out))
    return out[:cap]

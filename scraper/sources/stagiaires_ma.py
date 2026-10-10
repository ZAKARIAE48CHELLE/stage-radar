"""stagiaires.ma source.

Discovery: the public offer sitemaps (newest first, each <url> has a <lastmod>).
Details:   each offer page embeds a schema.org JobPosting in JSON-LD
           (title, description, datePosted, validThrough, hiringOrganization, jobLocation).
Both are allowed by the site's robots.txt (no query strings, crawl-delay respected).
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Iterable

from bs4 import BeautifulSoup
from lxml import etree

from ..http import PoliteSession
from ..models import Offer
from ..text import norm, CITIES

log = logging.getLogger(__name__)
NAME = "stagiaires.ma"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
OFFER_RE = re.compile(r"/stage-emploi-maroc/\d+-")


def discover(session: PoliteSession, sitemaps: list[str], max_age_days: int) -> list[tuple[str, str]]:
    """Return [(url, lastmod_iso)] for offers modified within max_age_days, newest first."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
    found: dict[str, str] = {}
    for sm in sitemaps:
        r = session.get(sm)
        if r is None:
            continue
        try:
            root = etree.fromstring(r.content)
        except etree.XMLSyntaxError as e:
            log.warning("Bad sitemap %s: %s", sm, e)
            continue
        for u in root.findall("sm:url", NS):
            loc = (u.findtext("sm:loc", default="", namespaces=NS) or "").strip()
            lastmod = (u.findtext("sm:lastmod", default="", namespaces=NS) or "").strip()
            if not OFFER_RE.search(loc):
                continue
            try:
                lm = datetime.fromisoformat(lastmod.replace("Z", "+00:00"))
            except ValueError:
                lm = datetime.now(timezone.utc)
            if lm >= cutoff:
                found[loc] = lm.date().isoformat()
    log.info("%s: %d offers in sitemap window", NAME, len(found))
    return sorted(found.items(), key=lambda kv: kv[1], reverse=True)


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


def _iso(d: str | None) -> str:
    if not d:
        return ""
    try:
        return datetime.fromisoformat(str(d).replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return str(d)[:10]


def _header_text(soup: BeautifulSoup) -> str:
    """Text of the offer header card (title + tags like 'Télétravail'), avoiding nav/footer links."""
    for h1 in soup.find_all("h1"):
        t = h1.get_text(" ", strip=True)
        if not t or "OPPORTUNIT" in t.upper():
            continue
        node = h1
        for _ in range(4):
            if node.parent is None:
                break
            node = node.parent
            txt = node.get_text(" ", strip=True)
            if "Postuler" in txt:
                return txt[:600]
        return h1.parent.get_text(" ", strip=True)[:600] if h1.parent else t
    return ""


def _modality(header: str, desc: str, jp: dict) -> str:
    if str(jp.get("jobLocationType", "")).upper() == "TELECOMMUTE":
        return "Télétravail"
    for blob in (header, desc[:1500]):
        n = norm(blob)
        if "teletravail" in n or "remote" in n or "full remote" in n:
            return "Télétravail"
        if "hybride" in n or "hybrid" in n:
            return "Hybride"
        if "sur site" in n or "presentiel" in n or "on-site" in n:
            return "Sur site"
    return ""


def _city(jp: dict, title: str, url: str, header: str, desc: str) -> str:
    loc = jp.get("jobLocation") or {}
    if isinstance(loc, list):
        loc = loc[0] if loc else {}
    addr = (loc.get("address") or {}) if isinstance(loc, dict) else {}
    locality = addr.get("addressLocality", "") if isinstance(addr, dict) else ""
    if locality and norm(locality) not in ("maroc", "morocco"):
        return locality
    for blob in (title, url, header, desc[:2000]):
        n = norm(blob)
        for c in CITIES:
            if norm(c) in n:
                return c
    return ""


def parse_offer(html: str, url: str) -> Offer | None:
    soup = BeautifulSoup(html, "lxml")
    jp = _find_jobposting(soup) or {}
    og_title = soup.find("meta", property="og:title")
    title = (jp.get("title") or "").strip()
    if not title:
        h1s = [h.get_text(" ", strip=True) for h in soup.find_all("h1")]
        h1s = [h for h in h1s if h and "OPPORTUNIT" not in h.upper()]
        title = h1s[0] if h1s else (og_title["content"].split(" chez ")[0] if og_title else "")
    if not title:
        return None

    desc_html = jp.get("description") or ""
    desc = BeautifulSoup(desc_html, "lxml").get_text("\n", strip=True) if desc_html else ""
    if not desc:
        md = soup.find("meta", attrs={"name": "description"})
        desc = md["content"] if md else ""

    org = jp.get("hiringOrganization") or {}
    company = org.get("name", "") if isinstance(org, dict) else str(org)
    if not company and og_title and " chez " in og_title.get("content", ""):
        company = og_title["content"].split(" chez ", 1)[1].split("|")[0].strip()

    header = _header_text(soup)
    emp = jp.get("employmentType", "")
    if isinstance(emp, list):
        emp = ",".join(emp)

    return Offer(
        url=url.replace("https://stagiaires.ma/", "https://www.stagiaires.ma/"),
        source=NAME,
        title=title,
        company=company.strip(),
        city=_city(jp, title, url, header, desc),
        modality=_modality(header, desc, jp),
        date_posted=_iso(jp.get("datePosted")),
        valid_through=_iso(jp.get("validThrough")),
        employment_type=str(emp),
        description=desc[:5000],
        logo=(org.get("logo", "") if isinstance(org, dict) else "") or "",
    )


def fetch_offer(session: PoliteSession, url: str) -> Offer | None:
    r = session.get(url)
    if r is None:
        return None
    try:
        return parse_offer(r.text, url)
    except Exception as e:  # never let one bad page kill the run
        log.warning("Parse failed for %s: %s", url, e)
        return None

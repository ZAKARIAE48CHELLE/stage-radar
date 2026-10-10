"""Job-alert e-mails from your own inbox (LinkedIn, Indeed, Rekrute, Emploi.ma, …).

Those sites forbid scraping, but they e-mail you alerts on request. This source reads
those alerts over IMAP (read-only) and extracts each job link + title. Nothing is fetched
from the job sites themselves: the e-mail text is all we use.

Setup (Gmail): enable 2-step verification → create an App Password →
set env vars / GitHub secrets IMAP_USER, IMAP_PASSWORD (and IMAP_HOST if not Gmail).
Then create alerts on each site (keywords: "stage data", "stage IA", "PFE machine learning"…).
"""
from __future__ import annotations

import email
import imaplib
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from email.header import decode_header, make_header
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse, parse_qs, unquote

from bs4 import BeautifulSoup

from ..models import Offer
from ..text import norm, CITIES

log = logging.getLogger(__name__)
NAME = "email"

# (site label, regex on href, canonicaliser)
PATTERNS = [
    ("LinkedIn", re.compile(r"linkedin\.com/(?:comm/)?jobs/view/(\d+)"),
     lambda m, h: f"https://www.linkedin.com/jobs/view/{m.group(1)}/"),
    ("Indeed", re.compile(r"indeed\.[a-z.]+/.*[?&]jk=([0-9a-f]{8,})"),
     lambda m, h: f"https://ma.indeed.com/viewjob?jk={m.group(1)}"),
    ("ReKrute", re.compile(r"rekrute\.com/(?:fr/)?offre-emploi-[^\s?#\"]+\.html"),
     lambda m, h: "https://www." + m.group(0).split("www.")[-1]),
    ("Emploi.ma", re.compile(r"emploi\.ma/offre-emploi-maroc/[^\s?#\"]+"),
     lambda m, h: "https://www." + m.group(0).split("www.")[-1]),
    ("Glassdoor", re.compile(r"glassdoor\.[a-z.]+/.*(?:jobListingId|jl)=(\d+)"),
     lambda m, h: f"https://www.glassdoor.com/job-listing/?jl={m.group(1)}"),
]
SKIP_TEXT = {"voir", "view", "voir l'offre", "postuler", "apply", "see all jobs", "voir plus",
             "unsubscribe", "se desabonner", "manage alerts", "gerer", "here", "ici"}


def _unwrap(href: str) -> str:
    """Follow common tracking wrappers that carry the target in a query parameter."""
    try:
        q = parse_qs(urlparse(href).query)
    except ValueError:
        return href
    for k in ("url", "u", "target", "redirect", "dest"):
        if k in q and q[k][0].startswith("http"):
            return unquote(q[k][0])
    return href


def _block_text(a) -> str:
    """Smallest ancestor that adds context (company, city) to the link text, without
    swallowing neighbouring offers."""
    title = a.get_text(" ", strip=True)
    node = a
    for _ in range(5):
        if node.parent is None:
            break
        parent = node.parent
        job_links = {x["href"] for x in parent.find_all("a", href=True)
                     if any(rx.search(_unwrap(x["href"])) for _, rx, _ in PATTERNS)}
        if len(job_links) > 1:      # parent holds several offers → stop here
            break
        node = parent
        t = node.get_text(" ", strip=True)
        if len(t) > len(title) + 8:
            return t[:500]
    return node.get_text(" ", strip=True)[:500]


def parse_alert_html(html_body: str, received: str) -> list[Offer]:
    soup = BeautifulSoup(html_body, "lxml")
    found: dict[str, Offer] = {}
    for a in soup.find_all("a", href=True):
        href = _unwrap(a["href"])
        for site, rx, canon in PATTERNS:
            m = rx.search(href)
            if not m:
                continue
            url = canon(m, href)
            title = re.sub(r"\s+", " ", a.get_text(" ", strip=True))
            if not title or norm(title) in SKIP_TEXT or len(title) < 6:
                break  # logo/button link — the title link usually comes next
            block = _block_text(a)
            rest = block.replace(title, "", 1).strip(" ·|-—")
            city = next((c for c in CITIES if norm(c) in norm(block)), "")
            modality = "Télétravail" if re.search(r"remote|t[ée]l[ée]travail", block, re.I) else \
                       "Hybride" if re.search(r"hybrid", block, re.I) else ""
            company = re.split(r"\s[·|•-]\s|\s{2,}", rest)[0][:60] if rest else ""
            if url not in found or len(title) > len(found[url].title):
                found[url] = Offer(url=url, source=f"{NAME}:{site}", title=title, company=company,
                                   city=city, modality=modality, date_posted=received,
                                   description=block)
            break
    return list(found.values())


def _html_of(msg: email.message.Message) -> str:
    for part in msg.walk() if msg.is_multipart() else [msg]:
        if part.get_content_type() == "text/html":
            payload = part.get_payload(decode=True) or b""
            return payload.decode(part.get_content_charset() or "utf-8", errors="replace")
    return ""


def collect(src: dict, known: set[str]) -> list[Offer]:
    user, pwd = os.getenv("IMAP_USER"), os.getenv("IMAP_PASSWORD")
    if not (user and pwd):
        log.info("email alerts: IMAP_USER / IMAP_PASSWORD not set — skipped")
        return []
    host = os.getenv("IMAP_HOST") or src.get("imap_host", "imap.gmail.com")
    since = (datetime.now(timezone.utc) - timedelta(days=src.get("lookback_days", 3))).strftime("%d-%b-%Y")
    out: dict[str, Offer] = {}
    try:
        imap = imaplib.IMAP4_SSL(host)
        imap.login(user, pwd)
        imap.select(src.get("folder", "INBOX"), readonly=True)  # never marks mails as read
        for sender in src.get("senders", []):
            typ, data = imap.search(None, "SINCE", since, "FROM", f'"{sender}"')
            if typ != "OK":
                continue
            for num in data[0].split()[-50:]:
                typ, raw = imap.fetch(num, "(RFC822)")
                if typ != "OK" or not raw or not raw[0]:
                    continue
                msg = email.message_from_bytes(raw[0][1])
                try:
                    received = parsedate_to_datetime(msg["Date"]).date().isoformat()
                except (TypeError, ValueError):
                    received = datetime.now(timezone.utc).date().isoformat()
                for o in parse_alert_html(_html_of(msg), received):
                    if o.url not in known:
                        out.setdefault(o.url, o)
        imap.logout()
    except (imaplib.IMAP4.error, OSError) as e:
        log.warning("email alerts: IMAP error: %s", e)
    log.info("email alerts: %d new offers (%s)", len(out),
             ", ".join(sorted({o.source.split(':')[1] for o in out.values()})) or "none")
    return list(out.values())


def subject(msg) -> str:  # helper for debugging in a REPL
    return str(make_header(decode_header(msg.get("Subject", ""))))

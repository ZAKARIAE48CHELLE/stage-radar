"""France Travail (ex-Pôle emploi) source — official Offres d'emploi v2 REST API.

Authorized API (OAuth2 client credentials), NOT web scraping.
Documentation: https://francetravail.io/
"""
from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timedelta, timezone

from ..http import PoliteSession
from ..models import Offer
from ..text import norm

log = logging.getLogger(__name__)
NAME = "france_travail"
TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire"
SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search"
PAGE_SIZE = 150
API_MAX = 1150  # France Travail limits results to indices 0..1149


def get_token(session: PoliteSession, client_id: str, client_secret: str, scope: str = "api_offresdemploiv2") -> str | None:
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": scope,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    r = session.post(TOKEN_URL, data=data, headers=headers)
    if r is None:
        log.warning("%s: failed to obtain access token", NAME)
        return None
    try:
        token = r.json().get("access_token")
        if not token:
            log.warning("%s: no access_token in token response", NAME)
            return None
        return str(token)
    except Exception as e:
        log.warning("%s: failed to parse token response: %s", NAME, e)
        return None


def _is_pfe(text: str) -> bool:
    n = norm(text)
    return any(k in n for k in ("pfe", "fin d'etudes", "fin d etudes", "projet de fin"))


def _modality(text: str) -> str:
    n = norm(text)
    if "teletravail" in n or "full remote" in n or "100% remote" in n:
        return "Télétravail"
    if "hybride" in n or "hybrid" in n:
        return "Hybride"
    return ""


def offer_json_to_offer(item: dict) -> Offer | None:
    intitule = (item.get("intitule") or "").strip()
    if not intitule:
        return None

    offre_id = str(item.get("id") or "").strip()
    origine = item.get("origineOffre") or {}
    url = (origine.get("urlOrigine") or "").strip()
    if not url:
        if offre_id:
            url = f"https://candidat.francetravail.fr/offres/recherche/detail/{offre_id}"
        else:
            return None

    entreprise = item.get("entreprise") or {}
    company = (entreprise.get("nom") or "").strip()

    lieu = item.get("lieuTravail") or {}
    city = (lieu.get("libelle") or "").strip()

    desc = (item.get("description") or "").strip()
    date_posted = str(item.get("dateCreation") or "")[:10]

    type_contrat = item.get("typeContrat") or ""
    is_alternance = bool(item.get("alternance"))

    full_text = f"{intitule} {desc}"
    n = norm(full_text)

    is_intern = (
        is_alternance
        or type_contrat in ("STG", "FS", "E1", "E2", "ALT")
        or any(k in n for k in ("stage", "stagiaire", "alternance", "alternant", "apprenti", "apprentissage", "pfe", "fin d'etudes"))
    )

    employment_type = "INTERN" if is_intern else type_contrat

    return Offer(
        url=url,
        source=NAME,
        title=intitule,
        company=company,
        city=city,
        modality=_modality(full_text),
        date_posted=date_posted,
        employment_type=employment_type,
        description=desc,
        is_pfe=_is_pfe(full_text),
    )


def collect(session: PoliteSession, src: dict, max_age_days: int, known: set[str], cap: int) -> list[Offer]:
    client_id = os.environ.get("FRANCE_TRAVAIL_CLIENT_ID")
    client_secret = os.environ.get("FRANCE_TRAVAIL_CLIENT_SECRET")
    if not client_id or not client_secret:
        log.info("%s: FRANCE_TRAVAIL_CLIENT_ID or FRANCE_TRAVAIL_CLIENT_SECRET unset — skipping source", NAME)
        return []

    token = get_token(session, client_id, client_secret, src.get("scope", "api_offresdemploiv2"))
    if not token:
        return []

    params: dict[str, str] = {}
    keywords = src.get("keywords") or src.get("motsCles")
    if keywords:
        params["motsCles"] = str(keywords)

    type_contrat = src.get("type_contrat") or src.get("typeContrat")
    if type_contrat:
        params["typeContrat"] = str(type_contrat)

    departements = src.get("departements") or src.get("departement")
    if departements:
        if isinstance(departements, (list, tuple)):
            params["departement"] = ",".join(str(d).strip() for d in departements if str(d).strip())
        else:
            params["departement"] = str(departements).strip()

    communes = src.get("communes") or src.get("commune")
    if communes:
        if isinstance(communes, (list, tuple)):
            params["commune"] = ",".join(str(c).strip() for c in communes if str(c).strip())
        else:
            params["commune"] = str(communes).strip()

    lookback = min(max_age_days, src.get("lookback_days", 45))
    since = datetime.now(timezone.utc) - timedelta(days=lookback)
    params["minCreationDate"] = since.strftime("%Y-%m-%dT%H:%M:%SZ")

    out: list[Offer] = []
    start = 0

    while start < API_MAX and len(out) < cap:
        end = min(start + PAGE_SIZE - 1, API_MAX - 1)
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Range": f"offres {start}-{end}",
        }

        r = session.get(SEARCH_URL, headers=headers, params=params, ok_statuses=(200, 206, 204))
        if r is None or r.status_code == 204:
            break

        cr = r.headers.get("Content-Range", "")
        total = None
        m = re.search(r"/(\d+)$", cr)
        if m:
            total = int(m.group(1))

        try:
            data = r.json()
        except Exception:
            log.warning("%s: non-JSON response for range %d-%d", NAME, start, end)
            break

        items = data.get("resultats", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
        if not items:
            break

        for item in items:
            o = offer_json_to_offer(item)
            if o and o.url not in known:
                out.append(o)
                if len(out) >= cap:
                    break

        if total is not None and (start + len(items)) >= total:
            break
        if len(items) < PAGE_SIZE:
            break

        start += PAGE_SIZE

    log.info("%s: %d new offers collected", NAME, len(out))
    return out[:cap]

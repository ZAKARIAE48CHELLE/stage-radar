"""Polite HTTP client: identifies itself, honours robots.txt and a crawl delay, retries on errors."""
from __future__ import annotations

import logging
import time
import urllib.robotparser
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

log = logging.getLogger(__name__)

NO_QUERY_HOSTS = ("stagiaires.ma",)  # robots.txt: Disallow: /*?*
USER_AGENT = "StageRadarBot/1.0 (personal internship search; +https://github.com/)"


class PoliteSession:
    def __init__(self, delay: float = 1.5, timeout: int = 25):
        self.delay = delay
        self.timeout = timeout
        self._last = 0.0
        self._robots: dict[str, urllib.robotparser.RobotFileParser] = {}
        self.s = requests.Session()
        self.s.headers.update({
            "User-Agent": USER_AGENT,
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        })
        retry = Retry(total=3, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504])
        self.s.mount("https://", HTTPAdapter(max_retries=retry))
        self.s.mount("http://", HTTPAdapter(max_retries=retry))

    def allowed(self, url: str) -> bool:
        p = urlparse(url)
        if "?" in url and p.netloc.endswith(NO_QUERY_HOSTS):
            return False  # these sites disallow /*?* in robots.txt
        root = f"{p.scheme}://{p.netloc}"
        rp = self._robots.get(root)
        if rp is None:
            rp = urllib.robotparser.RobotFileParser()
            try:
                r = self.s.get(root + "/robots.txt", timeout=self.timeout)
                rp.parse(r.text.splitlines() if r.ok else [])
            except requests.RequestException:
                rp.parse([])
            self._robots[root] = rp
        return rp.can_fetch(USER_AGENT, url)

    def get(self, url: str) -> requests.Response | None:
        if not self.allowed(url):
            log.warning("robots.txt disallows %s — skipped", url)
            return None
        wait = self.delay - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        try:
            r = self.s.get(url, timeout=self.timeout)
        except requests.RequestException as e:
            log.warning("GET %s failed: %s", url, e)
            return None
        finally:
            self._last = time.monotonic()
        if r.status_code != 200:
            log.warning("GET %s -> HTTP %s", url, r.status_code)
            return None
        return r

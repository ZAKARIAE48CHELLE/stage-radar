"""SQLite store of every offer ever fetched (raw fields only).

Filtering and scoring are re-run on the whole store at each export, so editing
config/profile.yaml re-classifies past offers without re-downloading anything.
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from .models import Offer

RAW_FIELDS = ["url", "source", "title", "company", "city", "modality", "date_posted",
              "valid_through", "employment_type", "description", "logo"]


class Store:
    def __init__(self, path: str | Path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(path))
        self.db.execute("""CREATE TABLE IF NOT EXISTS offers (
            url TEXT PRIMARY KEY,
            raw TEXT NOT NULL,
            first_seen TEXT NOT NULL,
            last_seen TEXT NOT NULL)""")
        self.db.commit()

    def known(self) -> set[str]:
        return {r[0] for r in self.db.execute("SELECT url FROM offers")}

    def upsert(self, offer: Offer) -> bool:
        """Insert or refresh. Returns True if the offer is new."""
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        raw = json.dumps({k: getattr(offer, k) for k in RAW_FIELDS}, ensure_ascii=False)
        cur = self.db.execute("SELECT 1 FROM offers WHERE url=?", (offer.url,)).fetchone()
        if cur:
            self.db.execute("UPDATE offers SET raw=?, last_seen=? WHERE url=?", (raw, now, offer.url))
        else:
            self.db.execute("INSERT INTO offers VALUES (?,?,?,?)", (offer.url, raw, now, now))
        self.db.commit()
        return cur is None

    def touch(self, urls: list[str]) -> None:
        """Mark offers still listed in the sitemap as seen today."""
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        self.db.executemany("UPDATE offers SET last_seen=? WHERE url=?", [(now, u) for u in urls])
        self.db.commit()

    def all(self) -> list[tuple[Offer, str, str]]:
        rows = self.db.execute("SELECT raw, first_seen, last_seen FROM offers").fetchall()
        return [(Offer(**json.loads(r[0])), r[1], r[2]) for r in rows]

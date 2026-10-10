"""Optional Telegram alert for new high-scoring offers.

Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (env vars or GitHub secrets) to enable.
Create a bot with @BotFather, send it any message, then read your chat id from
https://api.telegram.org/bot<TOKEN>/getUpdates
"""
from __future__ import annotations

import html
import logging
import os

import requests

log = logging.getLogger(__name__)


def telegram(new_offers: list[dict], cfg: dict, dashboard_url: str = "") -> None:
    token, chat = os.getenv("TELEGRAM_BOT_TOKEN"), os.getenv("TELEGRAM_CHAT_ID")
    if not (token and chat):
        log.info("Telegram not configured — skipping alert")
        return
    n = cfg["notify"]
    picks = sorted((o for o in new_offers if o["score"] >= n["min_score"]),
                   key=lambda o: o["score"], reverse=True)[: n["max_items"]]
    if not picks:
        log.info("No new offer above %s — no alert", n["min_score"])
        return
    lines = [f"🎯 <b>{len(picks)} nouvelle(s) offre(s) IA/Data</b>"]
    for o in picks:
        where = " · ".join(x for x in (o.get("city"), o.get("modality")) if x)
        lines.append(f"\n<b>{o['score']}%</b> — <a href=\"{html.escape(o['url'])}\">"
                     f"{html.escape(o['title'])}</a>\n{html.escape(o.get('company') or '?')}"
                     f"{' — ' + html.escape(where) if where else ''}")
    if dashboard_url:
        lines.append(f"\n📊 <a href=\"{html.escape(dashboard_url)}\">Ouvrir le dashboard</a>")
    try:
        r = requests.post(f"https://api.telegram.org/bot{token}/sendMessage", timeout=20, json={
            "chat_id": chat, "text": "\n".join(lines), "parse_mode": "HTML",
            "disable_web_page_preview": True})
        r.raise_for_status()
        log.info("Telegram alert sent (%d offers)", len(picks))
    except requests.RequestException as e:
        log.warning("Telegram alert failed: %s", e)

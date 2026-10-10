"""Local server for Stage Radar.
Serves static dashboard files from docs/ and provides API endpoints to trigger scraping.

Endpoints:
    POST /api/run      Trigger scraper run (body: {"no_fetch": bool, "max": int})
    GET  /api/status   Check whether a scrape is currently in progress
"""
from __future__ import annotations

import http.server
import json
import logging
import subprocess
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

log = logging.getLogger("stage-radar-server")

STATUS = {
    "running": False,
    "last_run": None,
    "message": "",
    "returncode": None,
    "log": "",
}
LOCK = threading.Lock()


def _run_worker(no_fetch: bool, max_pages: int | None):
    with LOCK:
        STATUS["running"] = True
        STATUS["message"] = "Recalcul des scores..." if no_fetch else "Scraping en cours..."
        STATUS["returncode"] = None
        STATUS["log"] = ""

    cmd = [sys.executable, "-m", "scraper.run"]
    if no_fetch:
        cmd.append("--no-fetch")
    else:
        cmd.extend(["--max", str(max_pages or 30), "-v"])

    log.info("Running: %s", " ".join(cmd))
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
        output = proc.stdout + ("\n" + proc.stderr if proc.stderr else "")
        with LOCK:
            STATUS["returncode"] = proc.returncode
            STATUS["last_run"] = datetime.now(timezone.utc).isoformat()
            STATUS["log"] = output[-2000:]
            if proc.returncode == 0:
                STATUS["message"] = "Terminé avec succès !"
            else:
                STATUS["message"] = f"Erreur (code {proc.returncode})"
        log.info("Finished with returncode %s", proc.returncode)
    except Exception as e:
        log.exception("Execution failed")
        with LOCK:
            STATUS["returncode"] = -1
            STATUS["message"] = f"Exception: {e}"
            STATUS["log"] = str(e)
    finally:
        with LOCK:
            STATUS["running"] = False


class RadarRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DOCS), **kwargs)

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            with LOCK:
                data = dict(STATUS)
            self._send_json(200, data)
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/run":
            with LOCK:
                if STATUS["running"]:
                    self._send_json(409, {"status": "error", "message": "Scrape déjà en cours", **STATUS})
                    return

            length = int(self.headers.get("Content-Length", 0))
            payload = {}
            if length > 0:
                try:
                    payload = json.loads(self.rfile.read(length).decode("utf-8"))
                except Exception:
                    pass

            no_fetch = bool(payload.get("no_fetch", False))
            max_pages = payload.get("max", 30)

            t = threading.Thread(target=_run_worker, args=(no_fetch, max_pages), daemon=True)
            t.start()

            self._send_json(202, {
                "status": "started",
                "message": "Scraping lancé en arrière-plan",
                "no_fetch": no_fetch,
                "max": max_pages
            })
            return

        self._send_json(404, {"error": "Not found"})


def run_server(port: int = 8000, host: str = "0.0.0.0"):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    addr = (host, port)
    server = http.server.ThreadingHTTPServer(addr, RadarRequestHandler)
    print(f"Stage Radar preview server running on http://localhost:{port} (API /api/run enabled)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    p = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8000
    run_server(port=p)

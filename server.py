"""Stage Radar local server entrypoint."""
import sys
from scraper.server import run_server

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8000
    run_server(port=port)

@echo off
cd /d "%~dp0\.."
echo [Stage Radar] Lancement de la collecte quotidienne...
call .venv\Scripts\activate.bat
python -m scraper.run --max 50 -v
echo [Stage Radar] Collecte terminee.

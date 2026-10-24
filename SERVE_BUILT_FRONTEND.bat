@echo off
echo ============================================================
echo   VyaparPilot AI - Production Server
echo   Serving Compiled Frontend + REST API on port 8000
echo ============================================================
echo.
cd /d "%~dp0backend"
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
)
echo Starting unified server on http://localhost:8000 ...
uvicorn app.main:app --host 127.0.0.1 --port 8000
pause

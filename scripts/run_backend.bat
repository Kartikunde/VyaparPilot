@echo off
echo ========================================================
echo   Starting VyaparPilot AI Backend (FastAPI + Uvicorn)
echo ========================================================
cd /d "%~dp0\..\backend"
venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
pause

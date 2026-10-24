@echo off
echo ============================================================
echo   Starting VyaparPilot AI (Full Stack)
echo   PRAGYAN 2K26 - Track 4-01
echo ============================================================
echo.
echo Starting Backend API Server on http://127.0.0.1:8000 ...
start "VyaparPilot Backend (:8000)" cmd /k "cd /d %~dp0backend && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) else (python -m venv venv && call venv\Scripts\activate.bat && pip install -r requirements.txt) && uvicorn app.main:app --host 127.0.0.1 --port 8000"

timeout /t 4 /nobreak >nul

echo Starting Frontend UI on http://localhost:5173 ...
start "VyaparPilot Frontend (:5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo Both servers launched successfully!
echo   Frontend Web App : http://localhost:5173
echo   Backend REST API : http://127.0.0.1:8000
echo   Interactive Docs : http://127.0.0.1:8000/docs
echo   Demo Login       : demo@vyaparpilot.in / demoPassword123!
echo ============================================================
pause

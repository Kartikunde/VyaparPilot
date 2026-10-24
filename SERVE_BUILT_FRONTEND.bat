@echo off
echo ============================================================
echo   Serving Production Pre-Built Frontend Bundle
echo   VyaparPilot AI (Compiled Static Distribution)
echo ============================================================
echo.
echo Serving pre-compiled dist/ on http://localhost:5000 ...
python -m http.server 5000 --directory "%~dp0frontend\dist"
pause

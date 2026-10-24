@echo off
echo ========================================================
echo   Seeding VyaparPilot AI Demo Database & Realistic Data
echo ========================================================
cd /d "%~dp0\.."
backend\venv\Scripts\python.exe scripts\seed_demo_data.py
pause

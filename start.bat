@echo off
REM Start PFMS locally without Docker
REM Prerequisites: Node.js 20+, PostgreSQL 16+

echo === PFMS Local Setup ===

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed. Install from https://nodejs.org/
    exit /b 1
)

REM Check PostgreSQL
where psql >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Warning: psql not found. Make sure PostgreSQL is installed and in PATH.
)

REM Create .env if needed
if not exist ".env" (
    copy .env.example .env
    echo Created .env - edit it with your API keys before continuing.
    echo.
    notepad .env
)

echo.
echo Setting up backend...
cd backend
call npm install
call npm run build

echo.
echo Starting backend on port 5000...
start "PFMS Backend" cmd /c "set DATABASE_URL=postgresql://pfms:pfms_password@localhost:5432/pfms && node dist/server.js"

echo.
echo Setting up frontend...
cd ..\frontend
call npm install

echo.
echo Starting frontend dev server on port 5173...
call npm run dev
